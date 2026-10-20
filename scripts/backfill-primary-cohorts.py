#!/usr/bin/env python3
"""Additive KS2 cohort/context backfill, matched to school URN and academic year.

Uses the official DfE institution-level school-information CSVs. Results are not
demographic-adjusted performance scores; suppressed/missing data remains unknown.
"""
import csv
import io
import json
import re
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/primary-cohort-context.json"
CATALOGUE = ROOT / "data/primary-schools.json"
BASE = "https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/"
DATASETS = {
    "2024/25": "3166c43a-c37e-4087-a0ec-4ed703f7a0b2",
    "2023/24": "93812ad3-55e8-4462-a052-82e9c67d143d",
}
MEASURES = {
    "telig": "eligibleYear6",
    "totpups": "wholeSchoolPupils",
    "tpupyear": "year6OnRoll",
    "belig": "eligibleBoys",
    "gelig": "eligibleGirls",
    "tfsm6cla1a": "disadvantagedCount",
    "ptfsm6cla1a": "disadvantagedPercent",
    "tealgrp2": "ealCount",
    "ptealgrp2": "ealPercent",
    "tsenelk": "senSupportCount",
    "psenelk": "senSupportPercent",
    "tsenele": "ehcpCount",
    "psenele": "ehcpPercent",
}
PERCENT = {x for x in MEASURES if x.startswith("pt") or x.startswith("ps")}
MISSING = {"", "z", "x", "c", "u", "low", "supp", "na", "n/a", "-", "..", ":"}

def parse(v):
    raw = str(v or "").strip().replace("%", "")
    if raw.lower() in MISSING:
        return None
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", raw):
        return None
    x = float(raw)
    return int(x) if x.is_integer() else x

def download(dataset_id):
    url = BASE + dataset_id + "/csv"
    req = urllib.request.Request(url, headers={"User-Agent": "OpenDay-Public-Primary-Cohort/1.0"})
    with urllib.request.urlopen(req, timeout=180) as response:
        reader = csv.DictReader(io.TextIOWrapper(response, encoding="utf-8-sig", newline=""))
        fields = set(reader.fieldnames or [])
        required = {"school_urn", "time_period", "telig", "ptfsm6cla1a", "ptealgrp2", "psenelk", "psenele"}
        if not required.issubset(fields):
            raise RuntimeError(f"Unexpected DfE schema {url}: {sorted(fields)}")
        for row in reader:
            yield row

def main():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))["schools"]
    urns = {str(s["urn"]): s for s in catalogue if s.get("urn")}
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    document = existing if existing.get("schemaVersion") == 1 else {"schemaVersion": 1, "schools": {}, "sources": {}}
    document.setdefault("schools", {})
    document.setdefault("sources", {})
    counts = Counter()
    for year, dataset_id in DATASETS.items():
        source_url = BASE + dataset_id
        document["sources"][year] = {
            "title": "DfE Key stage 2 institution-level: School information",
            "url": source_url,
            "csvUrl": source_url + "/csv",
            "release": "Final" if year == "2023/24" else "Revised",
            "sourceYear": year,
        }
        for row in download(dataset_id):
            urn = str(row.get("school_urn") or "").strip()
            if urn not in urns:
                continue
            year_value = re.sub(r"[^0-9]", "", str(row.get("time_period", "")))
            if year_value != year.replace("/", ""):
                continue
            values, missing_codes = {}, {}
            for column, name in MEASURES.items():
                raw = str(row.get(column, "")).strip()
                x = parse(raw)
                if x is None:
                    if raw:
                        missing_codes[name] = raw
                    continue
                if column in PERCENT and not 0 <= x <= 100:
                    raise RuntimeError(f"Invalid percentage {urn} {column}: {x}")
                if column not in PERCENT and x < 0:
                    raise RuntimeError(f"Invalid count {urn} {column}: {x}")
                values[name] = x
            if not values:
                continue
            school = document["schools"].setdefault(urn, {"name": urns[urn]["name"], "urn": urn, "years": {}})
            school["name"] = urns[urn]["name"]
            school["urn"] = urn
            school.setdefault("years", {})[year] = {
                **values,
                "codes": missing_codes,
                "sourceUrl": source_url,
                "sourceYear": year,
                "status": "official",
            }
            counts[year] += 1
        if counts[year] < 100:
            raise RuntimeError(f"Incomplete {year} coverage ({counts[year]}). No file changed.")
    document["meta"] = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "coverage": dict(counts),
        "trackedSchools": len(catalogue),
        "note": "Pupil composition and Year 6 eligibility are from the DfE school-information collection for that exam year. Disadvantage, EAL and SEN are characteristics, not judgements or adjusted performance. Missing/suppressed values remain unavailable.",
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Cohort backfill:", document["meta"]["coverage"])
    print("Pinner Wood:", document["schools"].get("131577", {}), flush=True)

if __name__ == "__main__":
    main()
