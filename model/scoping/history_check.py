"""How far back does each team gauge's river-level and flow data go?

Reads data/results/team_gauges.csv. Run from the repo root:
    python -m model.scoping.history_check
"""
import os
from pathlib import Path

import pandas as pd

from model.scoping.usgs_inventory import fetch_all, to_frame

PARAMS = {"00065": "stage (ft)", "00060": "flow (cfs)"}

def kind(row):
    """Label a series: 15-minute readings ('continuous') or one value per day ('daily mean')."""
    if row["computation_period_identifier"] == "Points" and row["computation_identifier"] == "Instantaneous":
        return "continuous"
    if row["computation_period_identifier"] == "Daily" and row["computation_identifier"] == "Mean":
        return "daily mean"
    return None

def main():
    api_key = os.getenv("USGS_API_KEY") or "DEMO_KEY"
    path = Path("data/results/team_gauges.csv")
    if not path.exists():
        raise SystemExit("Create data/results/team_gauges.csv first.")
    gauges = pd.read_csv(path, dtype=str)
    now = pd.Timestamp.now(tz="UTC")

    rows = []
    for g in gauges.to_dict("records"):
        series = to_frame(fetch_all("time-series-metadata", {"monitoring_location_id": g["site_id"], "limit": 1000}, api_key))
        if series.empty:
            print(f"{g['site_id']}: no series found at all")
            continue
        series = series[series["parameter_code"].isin(PARAMS)]
        for r in series.to_dict("records"):
            k = kind(r)
            if k is None:
                continue
            begin = pd.to_datetime(r["begin"], utc=True)
            end = pd.to_datetime(r["end"], utc=True)
            rows.append({
                "site_id": g["site_id"],
                "parameter": PARAMS[r["parameter_code"]],
                "kind": k,
                "primary": "Primary" if r.get("primary") == "Primary" else "no",
                "begin": begin.date().isoformat(),
                "end": end.date().isoformat(),
                "years": round((end - begin).days / 365.25, 1),
                "days_since_last": (now - end).days,
                "sublocation": r.get("sublocation_identifier") or "",
                "data_gap_interval": r.get("data_gap_interval") or "",
                "series_id": r["id"],
            })
        print(f"checked {g['site_id']}")

    if not rows:
        raise SystemExit("No stage or flow series found. Check the gauge IDs in team_gauges.csv.")
    df = pd.DataFrame(rows).sort_values(["site_id", "parameter", "kind", "years"], ascending=[True, True, True, False])
    out = Path("data/results/history_check.csv")
    df.to_csv(out, index=False)

    print("\n" + df[["site_id", "parameter", "kind", "primary", "begin", "years", "days_since_last", "sublocation"]].to_string(index=False))

    stage = df[(df["parameter"] == "stage (ft)") & (df["kind"] == "continuous") & (df["primary"] == "Primary")]
    best = stage.sort_values("years", ascending=False).drop_duplicates("site_id")
    missing = sorted(set(gauges["site_id"]) - set(best["site_id"]))
    print(f"\nSaved: {out}")
    print(f"Primary continuous stage series found at {len(best)} of {len(gauges)} gauges.")
    if missing:
        print("No Primary continuous stage series for:", ", ".join(missing))
    if not best.empty:
        start = best["begin"].max()
        years = round((now - pd.to_datetime(start, utc=True)).days / 365.25, 1)
        print(f"The latest start among them is {start}, so about {years} years of 15-minute stage data exist at all of them.")



if __name__ == "__main__":
    main()