"""Write FAKE sample data in the exact shape the website will receive.

The real forecasts replace this file later, with the same fields.
    python -m model.make_fixture
"""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from model.config import CHAIN, UPSTREAM


def stamp(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def category(stage, levels):
    for name in ("major", "moderate", "minor", "action"):
        if stage >= levels[name]:
            return name
    return "none"


def main():
    cand = pd.read_csv("data/results/candidate_gauges_51.csv", dtype=str)
    rows = cand[cand["site_id"].isin(UPSTREAM)].to_dict("records")
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    gauges = []
    for i, r in enumerate(rows):
        minor = float(r["minor_stage"])
        levels = {"action": float(r["action_stage"]), "minor": minor,
                  "moderate": float(r["moderate_stage"]), "major": float(r["major_stage"])}

        def level(hours):  # a made-up river that swells toward minor flood level
            return round(minor * 0.45 + 0.35 * minor * math.exp(-((hours - 20 - 4 * i) / 16) ** 2) + 0.4 * math.sin(hours / 7), 2)

        forecast = []
        for lead in (6, 12, 24, 48):
            mid, width = level(lead), 0.25 + 0.03 * lead
            forecast.append({"valid_at": stamp(now + timedelta(hours=lead)), "lead_hours": lead,
                             "low_ft": round(mid - width, 2), "median_ft": mid, "high_ft": round(mid + width, 2)})
        peak_med = max(f["median_ft"] for f in forecast)
        peak_high = max(f["high_ft"] for f in forecast)
        cat = category(peak_med, levels)
        gauges.append({
            "site_id": r["site_id"], "nws_id": r["nws_id"], "name": r["name"].title(),
            "chain": CHAIN[r["site_id"]], "upstream_site_id": UPSTREAM[r["site_id"]],
            "latitude": float(r["latitude"]), "longitude": float(r["longitude"]),
            "thresholds_ft": levels,
            "current": {"time": stamp(now), "stage_ft": level(0), "category": category(level(0), levels)},
            "observed": [{"time": stamp(now + timedelta(hours=h)), "stage_ft": level(h)} for h in range(-72, 1)],
            "forecast": forecast,
            "nws_forecast": [{"valid_at": stamp(now + timedelta(hours=h)), "stage_ft": round(level(h) + 0.3, 2)} for h in range(3, 73, 3)],
            "risk": {"category": cat, "label": "No flooding expected" if cat == "none" else f"Possible {cat} flooding",
                     "peak_median_ft": peak_med, "peak_high_ft": peak_high, "prob_minor": 0.05},
        })
    out = {"generated_at": stamp(now), "model_version": "SAMPLE", "is_sample_data": True, "gauges": gauges}
    Path("data/results/latest.json").write_text(json.dumps(out, indent=1))
    print(f"Wrote data/results/latest.json with {len(gauges)} gauges of FAKE sample data.")


if __name__ == "__main__":
    main()