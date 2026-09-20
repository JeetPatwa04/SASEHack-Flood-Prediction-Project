"""Download hourly river stage and rain for the team gauges.

    python -m model.pull_history --years 6
"""
import argparse
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

from model.config import UPSTREAM
from model.scoping.usgs_inventory import fetch_all, to_frame

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"


def windows(years):
    """Split the period into chunks under 3 years, which is USGS's limit for continuous data."""
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=int(365.25 * years))
    out, a = [], start
    while a < end:
        b = min(a + timedelta(days=1000), end)
        out.append((a, b))
        a = b
    return out


def fetch_stage(site, a, b, api_key):
    """Download 15-minute river level for one window. Tries simpler requests if USGS rejects one."""
    base = {"monitoring_location_id": site, "parameter_code": "00065", "time": f"{a:%Y-%m-%dT%H:%M:%SZ}/{b:%Y-%m-%dT%H:%M:%SZ}"}
    variants = [{**base, "properties": "value,time", "limit": 50000}, {**base, "limit": 50000}, {**base, "limit": 10000}]
    last = None
    for params in variants:
        try:
            return fetch_all("continuous", params, api_key)
        except ValueError as err:  # USGS said "bad request": try the next, simpler version
            last = err
    raise RuntimeError(f"USGS rejected every request for {site}: {last}")


def to_hourly(df):
    """15-minute readings -> one average per hour (UTC)."""
    t = pd.to_datetime(df["time"], utc=True)
    v = pd.to_numeric(df["value"], errors="coerce")
    s = pd.Series(v.values, index=t).sort_index()
    s = s[~s.index.duplicated()]
    s = s[(s > -50) & (s < 200)]  # drop sentinel and nonsense values
    s = s.resample("h").mean()
    s.index = s.index.tz_convert("UTC").tz_localize(None)
    return s


def fetch_rain(lat, lon, start, end):
    params = {"latitude": lat, "longitude": lon, "hourly": "precipitation", "timezone": "GMT",
              "start_date": start, "end_date": end}
    resp = requests.get(ARCHIVE, params=params, timeout=180)
    if resp.status_code != 200:
        raise RuntimeError(f"Open-Meteo error {resp.status_code}: {resp.text[:200]}")
    h = resp.json()["hourly"]
    return pd.Series(h["precipitation"], index=pd.to_datetime(h["time"]), dtype="float64")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--years", type=float, default=6)
    args = ap.parse_args()
    api_key = os.getenv("USGS_API_KEY") or "DEMO_KEY"

    cand = pd.read_csv("data/results/candidate_gauges_51.csv", dtype=str)
    gauges = cand[cand["site_id"].isin(UPSTREAM)]
    missing = set(UPSTREAM) - set(gauges["site_id"])
    if missing:
        raise SystemExit(f"These gauges are not in candidate_gauges_51.csv: {sorted(missing)}")
    Path("data/raw/hourly").mkdir(parents=True, exist_ok=True)
    rain_end = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    for g in gauges.to_dict("records"):
        site = g["site_id"]
        parts = []
        for a, b in windows(args.years):
            feats = fetch_stage(site, a, b, api_key)
            parts.append(to_frame(feats))
            print(f"  {site} {a:%Y-%m-%d} to {b:%Y-%m-%d}: {len(feats):,} readings")
        raw = pd.concat(parts, ignore_index=True)
        stage = to_hourly(raw)
        rain = fetch_rain(float(g["latitude"]), float(g["longitude"]), f"{stage.index.min():%Y-%m-%d}", rain_end)
        out = pd.DataFrame({"stage_ft": stage}).join(rain.rename("rain_mm"), how="outer")
        out.index.name = "time"
        out.to_csv(f"data/raw/hourly/{site}.csv")
        miss = out["stage_ft"].isna().mean()
        print(f"{site}  {g['name'][:32]:<32} hours: {len(out):,} | stage missing: {miss:.1%} | "
              f"max stage: {out['stage_ft'].max():.1f} ft | rain through {out['rain_mm'].last_valid_index()}")
        time.sleep(0.5)


if __name__ == "__main__":
    main()