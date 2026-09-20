"""Which USGS stream gauges in a state have a long, recent daily flow record?

Run from the repo root:
    python -m model.scoping.usgs_inventory --state-code 08
"""
import argparse
import os
import time
from pathlib import Path

import pandas as pd
import requests

BASE = "https://api.waterdata.usgs.gov/ogcapi/v1/collections"

def get_json(url, params=None, tries=3):
    """GET a URL and return its JSON. Retry if the network or server is busy."""
    last_error = None
    for attempt in range(tries):
        try:
            resp = requests.get(url, params=params, timeout=60)
        except requests.RequestException as err:  # network problem: retry
            last_error = err
        else:
            if resp.status_code == 429 or resp.status_code >= 500:  # busy server: retry
                last_error = f"HTTP {resp.status_code}"
            elif resp.status_code >= 400:  # our mistake: retrying won't help
                raise ValueError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            else:
                return resp.json()
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Request failed after {tries} tries: {last_error}")

def fetch_all(collection, params, api_key, max_pages=100):
    """Return every feature for a query, following the 'next' links page by page."""
    url = f"{BASE}/{collection}/items"
    params = {**params, "f": "json", "api_key": api_key}
    features = []
    for _ in range(max_pages):
        data = get_json(url, params)
        features += data.get("features", [])
        next_links = [l["href"] for l in data.get("links", []) if l.get("rel") == "next"]
        if not next_links or not data.get("features"):
            break
        # The next link already carries our filters, but not the API key.
        url, params = next_links[0], {"api_key": api_key}
    else:
        print(f"WARNING: stopped after {max_pages} pages, so results may be incomplete.")
    return features

def to_frame(features):
    """Flatten GeoJSON features into a table with one row per feature."""
    rows = []
    for f in features:
        row = dict(f.get("properties", {}))
        coords = (f.get("geometry") or {}).get("coordinates") or [None, None]
        row["longitude"], row["latitude"] = coords[0], coords[1]  # GeoJSON order is lon, lat
        rows.append(row)
    return pd.DataFrame(rows)

def get_stream_sites(state_code, api_key, page_size):
    """Stage 1: every USGS stream site in the state."""
    feats = fetch_all(
        "monitoring-locations",
        {"agency_code": "USGS", "state_code": state_code, "site_type_code": "ST", "limit": page_size},
        api_key,
    )
    df = to_frame(feats)
    if df.empty:
        return df
    keep = ["id", "monitoring_location_name", "hydrologic_unit_code", "drainage_area",
            "vertical_datum", "longitude", "latitude"]
    return df[keep].rename(columns={"id": "site_id", "monitoring_location_name": "name"})

def get_flow_series(sites, min_years, max_stale_days, api_key, page_size):
    """Stage 2: daily-mean flow series that are long enough and recently updated."""
    cutoff = (pd.Timestamp.now(tz="UTC") - pd.DateOffset(years=min_years)).strftime("%Y-%m-%dT00:00:00Z")
    params = {
        "parameter_code": "00060",   # discharge
        "statistic_id": "00003",     # daily mean
        "begin": f"../{cutoff}",     # record began before the cutoff
        "end": f"P{max_stale_days}D",  # newest reading within the last N days
        "limit": page_size,
    }
    pad = 0.1
    bbox = (f"{sites.longitude.min() - pad},{sites.latitude.min() - pad},"
            f"{sites.longitude.max() + pad},{sites.latitude.max() + pad}")
    try:
        feats = fetch_all("time-series-metadata", {**params, "bbox": bbox}, api_key)
    except ValueError as err:
        print(f"The bbox filter was rejected ({err}). Falling back to a nationwide query.")
        feats = fetch_all("time-series-metadata", params, api_key)
    return to_frame(feats)

def build_inventory(state_code, min_years, max_stale_days, api_key, page_size):
    sites = get_stream_sites(state_code, api_key, page_size)
    print(f"Stage 1: {len(sites)} USGS stream sites in state {state_code}")
    if sites.empty:
        return sites

    series = get_flow_series(sites, min_years, max_stale_days, api_key, page_size)
    print(f"Stage 2: {len(series)} flow series pass the date filters (before matching to the state)")
    if series.empty:
        return series
    series = series[series["primary"] == "Primary"]  # reviewed, long-term series only
    print(f"         {len(series)} of those are Primary series")

    series = series[["monitoring_location_id", "id", "begin", "end", "sublocation_identifier"]]
    series = series.rename(columns={"id": "series_id"})
    inv = sites.merge(series, left_on="site_id", right_on="monitoring_location_id", how="inner")
    inv = inv.drop(columns=["monitoring_location_id"])

    inv["begin"] = pd.to_datetime(inv["begin"], utc=True)
    inv["end"] = pd.to_datetime(inv["end"], utc=True)
    inv["years_of_record"] = ((inv["end"] - inv["begin"]).dt.days / 365.25).round(1)
    inv["days_since_last"] = (pd.Timestamp.now(tz="UTC") - inv["end"]).dt.days

    # One series per gauge: prefer no sublocation, then the longest record.
    inv["has_sublocation"] = inv["sublocation_identifier"].notna()
    inv = inv.sort_values(["site_id", "has_sublocation", "begin"])
    inv = inv.drop_duplicates("site_id", keep="first").drop(columns=["has_sublocation"])
    print(f"Stage 3: {len(inv)} gauges after matching to the state, keeping one series each")
    return inv.sort_values("years_of_record", ascending=False).reset_index(drop=True)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--state-code", required=True, help="two-digit code, e.g. 08 = Colorado, 12 = Florida")
    ap.add_argument("--min-years", type=int, default=15)
    ap.add_argument("--max-stale-days", type=int, default=7)
    ap.add_argument("--page-size", type=int, default=1000)
    args = ap.parse_args()

    state_code = args.state_code.zfill(2)
    api_key = os.getenv("USGS_API_KEY") or "DEMO_KEY"
    if api_key == "DEMO_KEY":
        print("Note: using DEMO_KEY, which is heavily rate limited. Set USGS_API_KEY for real use.")

    inv = build_inventory(state_code, args.min_years, args.max_stale_days, api_key, args.page_size)
    if inv.empty:
        print("No gauges matched. Try a lower --min-years or a higher --max-stale-days.")
        return

    out = Path("data/raw/scoping") / f"usgs_{state_code}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    inv.to_csv(out, index=False)

    print(f"\nSaved {len(inv)} gauges to {out}")
    print(f"Median record length: {inv['years_of_record'].median():.0f} years | "
          f"median days since last reading: {inv['days_since_last'].median():.0f}")
    print(inv[["site_id", "name", "years_of_record", "days_since_last", "drainage_area"]].head(15).to_string(index=False))
    bins = pd.cut(inv["drainage_area"], [0, 100, 500, 2000, 10000, float("inf")])
    print("\nGauges by drainage area (square miles):")
    print(inv.groupby(bins, observed=True).size())


if __name__ == "__main__":
    main()