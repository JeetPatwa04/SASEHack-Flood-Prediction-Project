"""Make live forecasts for the team gauges and write data/results/latest.json.

    python -m model.predict_live
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests

from backend.pipeline.nwps import get_stageflow
from model.config import CHAIN, HORIZONS, QUANTILES, UPSTREAM
from model.features import make_features
from model.pull_history import fetch_stage, to_hourly
from model.scoping.usgs_inventory import to_frame

FORECAST_API = "https://api.open-meteo.com/v1/forecast"


def stamp(t):
    return pd.Timestamp(t).strftime("%Y-%m-%dT%H:%M:%SZ")


def recent_stage(site, api_key, days=5):
    """Last few days of river level, hourly, with short gaps filled."""
    b = datetime.now(timezone.utc)
    feats = fetch_stage(site, b - timedelta(days=days), b, api_key)
    if not feats:
        raise RuntimeError("USGS returned no recent readings")
    stage = to_hourly(to_frame(feats))
    return stage.reindex(pd.date_range(stage.index.min(), stage.index.max(), freq="h")).interpolate(limit=3)


def recent_rain(lat, lon, days=5):
    """Past rain (model analysis) plus the next 3 days of forecast rain, hourly, in mm."""
    params = {"latitude": lat, "longitude": lon, "hourly": "precipitation", "timezone": "GMT",
              "past_days": days, "forecast_days": 3}
    resp = requests.get(FORECAST_API, params=params, timeout=60)
    resp.raise_for_status()
    h = resp.json()["hourly"]
    return pd.Series(h["precipitation"], index=pd.to_datetime(h["time"]), dtype="float64")


def nws_forecast(nws_id):
    """The official NWS forecast: returns (issued_at, [{valid_at, stage_ft}, ...])."""
    try:
        d = get_stageflow(nws_id)["forecast"]
    except Exception as err:
        print(f"  NWS forecast unavailable for {nws_id}: {err}")
        return None, []
    pts = [{"valid_at": p["validTime"], "stage_ft": round(float(p["primary"]), 2)}
           for p in d.get("data", []) if p.get("primary") is not None and float(p["primary"]) > -50]
    return d.get("issuedTime"), pts


def category(stage, levels):
    for name in ("major", "moderate", "minor", "action"):
        if stage >= levels[name]:
            return name
    return "none"


def prob_exceed(level, low, med, high):
    """Rough chance the river passes `level`, from the low/middle/high estimates (an approximation)."""
    if level <= low:
        cdf = 0.1 * max(0.0, 1 - (low - level) / max(med - low, 1e-6))
    elif level <= med:
        cdf = 0.1 + 0.4 * (level - low) / max(med - low, 1e-6)
    elif level <= high:
        cdf = 0.5 + 0.4 * (level - med) / max(high - med, 1e-6)
    else:
        cdf = 0.9 + 0.1 * min(1.0, (level - high) / max(high - med, 1e-6))
    return 1 - cdf


def risk_label(cat_med, cat_high):
    if cat_med == "action":
        return "Near flood stage"
    if cat_med != "none":
        return f"Likely {cat_med} flooding"
    if cat_high != "none":
        return "Rising toward flood stage" if cat_high == "action" else f"Possible {cat_high} flooding"
    return "No flooding expected"


def main():
    api_key = os.getenv("USGS_API_KEY") or "DEMO_KEY"
    cand = pd.read_csv("data/results/candidate_gauges_51.csv", dtype=str)
    rows = cand[cand["site_id"].isin(UPSTREAM)].to_dict("records")
    now = pd.Timestamp.now(tz="UTC").tz_localize(None).floor("h")

    stages, rains = {}, {}
    for r in rows:  # first collect recent data for every gauge, since some models need the upstream gauge
        site = r["site_id"]
        try:
            stages[site] = recent_stage(site, api_key)
            rains[site] = recent_rain(float(r["latitude"]), float(r["longitude"]))
        except Exception as err:
            print(f"{site}: could not get recent data ({err})")

    gauges, log_rows = [], []
    for r in rows:
        site = r["site_id"]
        if site not in stages or not Path(f"models/{site}.joblib").exists():
            print(f"{site}: skipped (no recent data or no trained model)")
            continue
        levels = {k: float(r[f"{k}_stage"]) for k in ("action", "minor", "moderate", "major")}
        bundle = joblib.load(f"models/{site}.joblib")
        stage = stages[site]
        rain = rains[site].reindex(stage.index)
        up = stages.get(UPSTREAM[site]) if UPSTREAM[site] else None
        X = make_features(stage, rain, up)
        last = stage.last_valid_index()
        row = X.loc[[last], bundle["features"]]
        now_stage = float(stage[last])

        forecast = []
        for h in HORIZONS:
            if h in bundle["models"]:
                p = np.sort([now_stage + bundle["models"][h][q].predict(row)[0] for q in QUANTILES])
                forecast.append({"valid_at": stamp(last + pd.Timedelta(hours=h)), "lead_hours": h,
                                 "low_ft": round(float(p[0]), 2), "median_ft": round(float(p[1]), 2), "high_ft": round(float(p[2]), 2)})
        peak_med = max(f["median_ft"] for f in forecast)
        peak_high = max(f["high_ft"] for f in forecast)
        cat_med, cat_high = category(peak_med, levels), category(peak_high, levels)
        prob_minor = max(prob_exceed(levels["minor"], f["low_ft"], f["median_ft"], f["high_ft"]) for f in forecast)

        rain_full = rains[site]
        issued, nws_pts = nws_forecast(r["nws_id"])
        gauges.append({
            "site_id": site, "nws_id": r["nws_id"], "name": r["name"].title(), "chain": CHAIN[site],
            "upstream_site_id": UPSTREAM[site], "latitude": float(r["latitude"]), "longitude": float(r["longitude"]),
            "thresholds_ft": levels,
            "current": {"time": stamp(last), "stage_ft": round(now_stage, 2), "category": category(now_stage, levels)},
            "observed": [{"time": stamp(t), "stage_ft": round(float(v), 2)} for t, v in stage.iloc[-72:].dropna().items()],
            "forecast": forecast,
            "nws_issued_at": issued, "nws_forecast": nws_pts,
            "risk": {"category": cat_med if cat_med != "none" else cat_high, "label": risk_label(cat_med, cat_high),
                     "peak_median_ft": peak_med, "peak_high_ft": peak_high, "prob_minor": round(float(prob_minor), 3)},
            "rain_mm": {"past_24h": round(float(rain_full[(rain_full.index > last - pd.Timedelta(hours=24)) & (rain_full.index <= last)].sum()), 1),
                        "next_24h": round(float(rain_full[(rain_full.index > last) & (rain_full.index <= last + pd.Timedelta(hours=24))].sum()), 1),
                        "next_48h": round(float(rain_full[(rain_full.index > last) & (rain_full.index <= last + pd.Timedelta(hours=48))].sum()), 1)},
        })
        for f in forecast:
            log_rows.append({"site_id": site, "issued_at": stamp(last), **f})
        print(f"{r['name'][:34]:<34} now {now_stage:5.2f} ft | forecast (median) "
              + ", ".join(f"{f['lead_hours']}h {f['median_ft']:.2f}" for f in forecast) + f" | {risk_label(cat_med, cat_high)}")

    if not gauges:
        raise SystemExit("No forecasts were produced. Check the messages above.")
    out = {"generated_at": stamp(pd.Timestamp.now(tz="UTC")), "model_version": "hgb-quantile-v1", "is_sample_data": False, "gauges": gauges}
    Path("data/results/latest.json").write_text(json.dumps(out, indent=1))
    log = Path("data/raw/forecast_log.csv")   # our own forecast history, for scoring against NWS later
    pd.DataFrame(log_rows).to_csv(log, mode="a", header=not log.exists(), index=False)
    print(f"\nWrote data/results/latest.json with {len(gauges)} gauges (forecast log: {log})")


if __name__ == "__main__":
    main()