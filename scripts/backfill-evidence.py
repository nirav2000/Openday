#!/usr/bin/env python3
"""Non-destructive OpenDay EBacc history and travel backfill.

Existing examination records and hand-researched journeys are never overwritten.
Absent/suppressed data stays absent, never zero. External lookups can fail safely.
"""
import json, math, os, re, time, urllib.parse, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "HA1 3PU"
STAMP = datetime.now(timezone.utc).strftime("%Y-%m-%d")
HEADERS = {"User-Agent": "OpenDay-school-research/1.0 (educational comparison)"}

def read(path, fallback):
    p = ROOT / path
    return json.loads(p.read_text()) if p.exists() else fallback

def write(path, data):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=8) as response:
        return json.load(response)

def postcode_location(postcode):
    payload = get("https://api.postcodes.io/postcodes/" + urllib.parse.quote(postcode))
    result = payload.get("result") or {}
    return result["longitude"], result["latitude"]

def road_route(start, end):
    a, b = start, end
    url = ("https://router.project-osrm.org/route/v1/driving/"
           + str(a[0]) + "," + str(a[1]) + ";" + str(b[0]) + "," + str(b[1])
           + "?overview=false")
    routes = get(url).get("routes") or []
    if not routes:
        return None
    r = routes[0]
    return {"minutes": math.ceil(r["duration"] / 60),
            "distanceKm": round(r["distance"] / 1000, 1),
            "sourceUrl": url, "method": "OSRM baseline; excludes congestion, parking and school-run delays"}

def main():
    performance = read("data/performance.json", {"schools":[]})
    ebacc = read("data/ebacc-history.json", {"schemaVersion":1,"schools":{}})
    ebacc["note"] = "Historical DfE EBacc measures only (last year 2024/25). Never interpret missing as zero."
    ebacc["source"] = "data/performance.json (official DfE KS4 records)"
    for school in performance.get("schools", []):
        key = school["name"]
        old = ebacc["schools"].setdefault(key, {})
        for year, row in (school.get("gcse") or {}).items():
            if not year.isdigit() or int(year) > 202425:
                continue
            vals = {k:row.get(k) for k in ("ebaccEntry","ebaccAPS")}
            if not any(v is not None for v in vals.values()):
                continue
            if year not in old:
                old[year] = {"year":year, **vals, "source":"DfE KS4 via data/performance.json"}
    write("data/ebacc-history.json", ebacc)

    senior = read("data/schools.json", {"schools":[]}).get("schools",[])
    primary = read("data/primary-schools.json", {"schools":[]}).get("schools",[])
    enhancements = read("data/enhancements.json", {"schools":{}}).get("schools",{})
    locations = read("data/school-locations.json", {"schools":{}}).get("schools",{})
    travel = read("data/journey-backfill.json", {"schemaVersion":1,"origin":ORIGIN,"schools":{}})
    travel["origin"] = ORIGIN
    travel["note"] = "Car baseline from OSRM using postcode centroids; not live traffic. Missing means not verified. Primary catchment distances still use UB5 6QX."
    all_schools = {}
    for phase, group in (("senior",senior),("primary",primary)):
        for s in group:
            entry = all_schools.setdefault(s["name"], {"phase":phase,"ids":[],"postcode":s.get("postcode")})
            entry["ids"].append(s["id"])
            if not entry["postcode"]:
                entry["postcode"] = s.get("postcode")
    try:
        origin = postcode_location(ORIGIN)
    except Exception as exc:
        print("Origin postcode lookup unavailable:",exc)
        origin = None
    missing = []
    for name, school in all_schools.items():
        old = travel["schools"].get(name, {})
        row = dict(old)
        row.update({"phase":school["phase"],"eventIds":school["ids"],"origin":ORIGIN})
        if row.get("driveMinutes") is not None:
            row["postcode"] = postcode = locations.get(name,{}).get("postcode") or school.get("postcode")
            travel["schools"][name] = row
            continue
        postcode = locations.get(name,{}).get("postcode") or school.get("postcode")
        if not postcode:
            # Never guess an address from a school name.
            row["status"] = "postcode-not-verified"
            missing.append(name)
        elif origin is None:
            row["status"] = "origin-unavailable"
        else:
            try:
                route = road_route(origin, postcode_location(postcode))
                if route and 0 < route["minutes"] < 600:
                    row.update({"postcode":postcode,"driveMinutes":route["minutes"],
                                "distanceKm":route["distanceKm"],"sourceUrl":route["sourceUrl"],
                                "method":route["method"],"verifiedAt":STAMP,"status":"modelled"})
                else:
                    row["status"] = "no-route"
            except Exception as exc:
                row["status"] = "lookup-failed"
                row["error"] = str(exc)[:180]
            time.sleep(0.15)
        travel["schools"][name] = row
    travel["coverage"] = {"schools":len(all_schools),
                          "drivingBackfilled":sum(x.get("driveMinutes") is not None for x in travel["schools"].values()),
                          "missingVerifiedPostcode":len(missing)}
    write("data/journey-backfill.json", travel)
    # Transit journeys are independently dated. Keep every previous good estimate.
    travel["transitNote"] = "TfL journey planner itinerary to arrive 08:30 on the next weekday; may include walking legs. Check live service changes."
    today = datetime.now(timezone.utc).date()
    day = today + timedelta(days=1)
    while day.weekday() > 4: day += timedelta(days=1)
    def lookup_transit(item):
        name, school = item
        row = dict(travel["schools"][name])
        postcode = locations.get(name,{}).get("postcode") or school.get("postcode")
        if not postcode: return name,row
        if row.get("transitMinutes") is not None and row.get("transitArrivalDate") == day.isoformat(): return name,row
        params = urllib.parse.urlencode({"date":day.strftime("%Y%m%d"),"time":"0830","timeIs":"Arriving","nationalSearch":"true"})
        url = "https://api.tfl.gov.uk/Journey/JourneyResults/" + urllib.parse.quote(ORIGIN) + "/to/" + urllib.parse.quote(postcode) + "?" + params
        try:
            journeys = get(url).get("journeys",[])
            valid = [j for j in journeys if any(leg.get("mode",{}).get("id") not in ("walking","cycle","cycle-hire") for leg in j.get("legs",[]))]
            if valid:
                j = min(valid,key=lambda x:x["duration"])
                if 0 < j["duration"] < 600:
                    row.update({"transitMinutes":j["duration"],"transitStatus":"scheduled-itinerary","transitArrivalDate":day.isoformat(),"transitSourceUrl":url,"transitRetrievedAt":STAMP,"transitDeparture":j.get("startDateTime"),"transitArrival":j.get("arrivalDateTime"),"transitLegs":[{"mode":leg.get("mode",{}).get("id"),"minutes":leg.get("duration")} for leg in j.get("legs",[])]})
            elif journeys:
                row["walkMinutes"] = min(j["duration"] for j in journeys)
                row["transitStatus"] = "walking-only"
            else: row["transitStatus"] = "no-itinerary-returned"
        except Exception as exc:
            row["transitStatus"] = "lookup-failed" if row.get("transitMinutes") is None else "previous-estimate-preserved"
            row["transitLookupError"] = str(exc)[:160]
        return name,row
    with ThreadPoolExecutor(max_workers=4) as pool:
        for idx,(name,row) in enumerate(pool.map(lookup_transit,all_schools.items())):
            travel["schools"][name]=row
            if idx%20==0: print("Transit processed",idx+1,"of",len(all_schools),flush=True)
    travel["coverage"] = {"schools":len(all_schools),"drivingBackfilled":sum(x.get("driveMinutes") is not None for x in travel["schools"].values()),"publicTransportBackfilled":sum(x.get("transitMinutes") is not None for x in travel["schools"].values()),"missingVerifiedPostcode":sum(not locations.get(name,{}).get("postcode") for name in all_schools),"transitStatuses":dict(Counter(x.get("transitStatus") for x in travel["schools"].values()))}
    write("data/journey-backfill.json",travel)
    print("Transit coverage:",travel["coverage"],flush=True)
    print("EBacc history schools:",sum(bool(v) for v in ebacc["schools"].values()))
    print("Journey coverage:",travel["coverage"])

if __name__ == "__main__":
    main()
