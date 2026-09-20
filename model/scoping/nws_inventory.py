"""Which of our USGS gauges also have an official NWS forecast and flood levels?

Run from the repo root, after usgs_inventory has run for the same state:
    python -m model.scoping.nws_inventory --state-code 13
"""
import argparse
import csv
import io
from pathlib import Path

import pandas as pd
import requests

NWS_URL = "https://water.noaa.gov/resources/downloads/reports/nwps_all_gauges_report.csv"
CACHE = Path("data/raw/scoping/nwps_all_gauges.csv")

# The NWS columns we keep, and what we call them.
KEEP = {
    "nws shef id": "nws_id",
    "usgs id": "usgs_num",
    "location name": "nws_name",
    "state": "state",
    "action stage": "action_stage",
    "flood stage": "minor_stage",
    "moderate flood stage": "moderate_stage",
    "major flood stage": "major_stage",
    "flood stage unit": "stage_unit",
    "pedts": "pedts",
    "in service": "in_service",
    "forecast status": "forecast_status",
    "nrldb vertical datum name": "nws_datum",
    "rfc": "rfc",
}

def load_nws(refresh):
    """Load NOAA's all-gauges report (one row per NWS gauge), downloading it if needed."""
    if refresh or not CACHE.exists():
        print("Downloading NOAA's all-gauges report...")
        resp = requests.get(NWS_URL, timeout=120)
        resp.raise_for_status()
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(resp.content.decode("utf-8", errors="replace"), encoding="utf-8")
    text = CACHE.read_text(encoding="utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    header, body = rows[0], rows[1:]
    # Pad or trim uneven rows so every row matches the header.
    body = [(r + [""] * len(header))[: len(header)] for r in body if r]
    return pd.DataFrame(body, columns=header)

def clean_nws(raw):
    missing = [c for c in KEEP if c not in raw.columns]
    if missing:
        raise SystemExit(f"NOAA's report no longer has these columns: {missing}. Print raw.columns to see what changed.")
    df = raw[list(KEEP)].rename(columns=KEEP).copy()
    for col in ["action_stage", "minor_stage", "moderate_stage", "major_stage"]:
        # NOAA uses -9999 to mean "no value". Turn it into a real blank.
        df[col] = pd.to_numeric(df[col], errors="coerce").replace(-9999, float("nan"))
    df["usgs_num"] = df["usgs_num"].str.strip()
    df["in_service"] = df["in_service"].str.strip().str.lower() == "true"
    df["is_river_stage"] = df["pedts"].str.upper().str.startswith("HG")  # HG = river stage
    df["routine_forecast"] = df["forecast_status"].str.contains("issued routinely", case=False)
    return df

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--state-code", required=True, help="the same two-digit code you gave usgs_inventory")
    ap.add_argument("--refresh", action="store_true", help="download NOAA's report again")
    args = ap.parse_args()
    state_code = args.state_code.zfill(2)

    usgs_path = Path("data/raw/scoping") / f"usgs_{state_code}.csv"
    if not usgs_path.exists():
        raise SystemExit(f"Run this first: python -m model.scoping.usgs_inventory --state-code {state_code}")
    usgs = pd.read_csv(usgs_path, dtype={"site_id": str, "hydrologic_unit_code": str, "series_id": str})
    usgs["usgs_num"] = usgs["site_id"].str.replace("USGS-", "", regex=False)

    nws = clean_nws(load_nws(args.refresh))
    nws = nws[nws["usgs_num"] != ""]
    nws = nws.sort_values("routine_forecast", ascending=False).drop_duplicates("usgs_num")

    merged = usgs.merge(nws, on="usgs_num", how="left")  # keep every USGS gauge so we can see the funnel
    matched = merged["nws_id"].notna()
    for col in ["in_service", "is_river_stage", "routine_forecast"]:
        merged[col] = merged[col].eq(True)  # unmatched gauges become False

    steps = [
        ("USGS gauges from your inventory", pd.Series(True, index=merged.index)),
        ("  ...that NWS also lists (matched by USGS ID)", matched),
        ("  ...in service and reporting river stage", merged["in_service"] & merged["is_river_stage"]),
        ("  ...with routine official forecasts", merged["routine_forecast"]),
        ("  ...with official flood levels", merged["minor_stage"].notna()),
    ]
    mask = pd.Series(True, index=merged.index)
    print(f"\nFunnel for state {state_code}:")
    for label, cond in steps:
        mask &= cond
        print(f"{label:<50}{int(mask.sum()):>5}")

    ok = matched & merged["in_service"] & merged["is_river_stage"]
    print("\nForecast status among matched, in-service river gauges:")
    print(merged.loc[ok, "forecast_status"].str.slice(0, 70).value_counts().to_string())

    cand = merged[mask].sort_values("drainage_area")
    if cand.empty:
        print("\nNo gauges passed every filter.")
        return
    if (cand["stage_unit"] != "ft").any():
        print("WARNING: some flood levels are not in feet. Check stage_unit before using them.")

    cols = ["site_id", "nws_id", "name", "drainage_area", "years_of_record", "action_stage", "minor_stage",
            "moderate_stage", "major_stage", "stage_unit", "vertical_datum", "nws_datum",
            "latitude", "longitude", "hydrologic_unit_code", "series_id"]
    out = Path("data/results") / f"candidate_gauges_{state_code}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    cand[cols].to_csv(out, index=False)

    print(f"\n{len(cand)} candidate gauges saved to {out}")
    bins = pd.cut(cand["drainage_area"], [0, 100, 500, 2000, 10000, float("inf")])
    print("\nCandidates by drainage area (square miles):")
    print(cand.groupby(bins, observed=True).size().to_string())
    print("\n" + cand[["site_id", "nws_id", "name", "drainage_area", "years_of_record", "minor_stage",
                       "vertical_datum", "nws_datum"]].head(30).to_string(index=False))


if __name__ == "__main__":
    main()
