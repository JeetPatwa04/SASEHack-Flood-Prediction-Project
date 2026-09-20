"""How many real floods does each candidate gauge have? Uses USGS annual peak records.

Run from the repo root, after nws_inventory has made the candidate list:
    python -m model.scoping.flood_counts --state-code 51
    python -m model.scoping.flood_counts --state-code 51 --first 3     # quick test on 3 gauges
"""
import argparse
import os
import time
from pathlib import Path

import pandas as pd

from model.scoping.usgs_inventory import fetch_all, to_frame

STAGE = "00065"  # river level in feet, the same kind of number as NWS flood levels
FLOW = "00060"   # river flow in cubic feet per second

def count_floods(peaks, row, since):
    """Summarize one gauge's annual peaks against its official flood levels."""
    out = {"stage_peaks": 0, "flow_peaks": 0}
    if peaks.empty:
        return out
    peaks = peaks.copy()
    peaks["value"] = pd.to_numeric(peaks["value"], errors="coerce")
    peaks["year"] = pd.to_numeric(peaks["year"], errors="coerce")
    out["flow_peaks"] = int((peaks["parameter_code"] == FLOW).sum())
    stage = peaks[(peaks["parameter_code"] == STAGE) & peaks["value"].notna()]
    out["stage_peaks"] = len(stage)
    if stage.empty:
        return out
    out["first_year"], out["last_year"] = int(stage["year"].min()), int(stage["year"].max())
    out["max_peak_ft"] = stage["value"].max()
    recent = stage[stage["year"] >= since]
    out["peaks_since"] = len(recent)
    for name in ["action", "minor", "moderate", "major"]:
        level = row[f"{name}_stage"] if f"{name}_stage" in row else float("nan")
        if pd.notna(level):
            out[f"{name}_all"] = int((stage["value"] >= level).sum())
            out[f"{name}_since"] = int((recent["value"] >= level).sum())
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--state-code", required=True)
    ap.add_argument("--since", type=int, default=1990, help="also count floods from this year on")
    ap.add_argument("--first", type=int, default=0, help="only test the first N gauges")
    args = ap.parse_args()
    state_code = args.state_code.zfill(2)

    path = Path("data/results") / f"candidate_gauges_{state_code}.csv"
    if not path.exists():
        raise SystemExit(f"Run this first: python -m model.scoping.nws_inventory --state-code {state_code}")
    cand = pd.read_csv(path, dtype={"site_id": str, "nws_id": str, "hydrologic_unit_code": str, "series_id": str})
    if args.first:
        cand = cand.head(args.first)
    api_key = os.getenv("USGS_API_KEY") or "DEMO_KEY"

    results, failures = [], 0
    for i, row in enumerate(cand.to_dict("records"), start=1):
        try:
            feats = fetch_all("peaks", {"monitoring_location_id": row["site_id"], "limit": 1000}, api_key)
            failures = 0
        except (ValueError, RuntimeError) as err:
            failures += 1
            print(f"[{i}/{len(cand)}] {row['site_id']} FAILED: {err}")
            if failures >= 3:
                raise SystemExit("Three requests in a row failed. Check the collection name and your API key.")
            continue
        summary = count_floods(to_frame(feats), row, args.since)
        print(f"[{i}/{len(cand)}] {row['site_id']:<14} stage peaks: {summary['stage_peaks']:>3} | "
              f"flow peaks: {summary['flow_peaks']:>3} | minor floods: {summary.get('minor_all', '-')}")
        results.append({**{k: row[k] for k in ["site_id", "nws_id", "name", "drainage_area", "minor_stage"]}, **summary})
        time.sleep(0.2)
    if not results:
        raise SystemExit("No results.")
    df = pd.DataFrame(results)
    out = Path("data/results") / f"flood_counts_{state_code}.csv"
    df.to_csv(out, index=False)

    with_stage = df[df["stage_peaks"] > 0]
    print(f"\n{len(with_stage)} of {len(df)} gauges have river-level (stage) peak records. Saved: {out}")
    if with_stage.empty:
        print("None have stage peaks. Flow peaks exist for some gauges, but they can't be compared to flood levels in feet.")
        return
    since_col = "minor_since"
    for n in (3, 5, 10):
        print(f"  gauges with {n}+ minor-flood peaks since {args.since}: {int((with_stage[since_col] >= n).sum())}")
    show = ["site_id", "name", "drainage_area", "minor_stage", "first_year", "stage_peaks", "minor_all", since_col, "moderate_all"]
    print("\n" + with_stage.sort_values(since_col, ascending=False)[show].head(25).to_string(index=False))



if __name__ == "__main__":
    main()