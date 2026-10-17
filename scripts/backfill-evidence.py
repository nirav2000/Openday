#!/usr/bin/env python3
"""Non-destructive OpenDay EBacc history and travel backfill.

Existing examination records and hand-researched journeys are never overwritten.
Absent/suppressed data stays absent, never zero. External lookups can fail safely.
"""
import json, math, os, re, time, urllib.parse, urllib.request
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
    with urllib.request.urlopen(req, timeout=22) as response:
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
            travel["schools"][name] = row
            continue
        postcode = school.get("postcode")
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
    print("EBacc history schools:",sum(bool(v) for v in ebacc["schools"].values()))
    print("Journey coverage:",travel["coverage"])

if __name__ == "__main__":
    main()
