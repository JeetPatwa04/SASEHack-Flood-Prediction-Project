"""Fetch daily river data from the NEW USGS Water Data API.

IMPORTANT: do not use waterservices.usgs.gov or the old `nwis` module of the
Python `dataretrieval` package. Those are being decommissioned (planned for
early 2027) and may already be unreliable.

Docs:     https://api.waterdata.usgs.gov/docs/ogcapi/
API key:  https://api.waterdata.usgs.gov/signup/   (free, gives higher rate limits)
"""
from __future__ import annotations

import os
import time

import pandas as pd
import requests

BASE_URL = "https://api.waterdata.usgs.gov/ogcapi/v1/collections/daily/items"

DISCHARGE = "00060"    # streamflow, cubic feet per second
GAGE_HEIGHT = "00065"  # river level, feet
MEAN = "00003"         # statistic code for the daily mean


def normalize_site_id(site_id: str) -> str:
    """Accept '01646500' or 'USGS-01646500' and return 'USGS-01646500'."""
    site_id = str(site_id).strip()
    return site_id if site_id.upper().startswith("USGS-") else f"USGS-{site_id}"


def _get_with_retry(url: str, params: dict, tries: int = 3) -> dict:
    """GET a URL, retrying on rate limits (429) and server errors (5xx)."""
    last_error = None
    for attempt in range(tries):
        try:
            resp = requests.get(url, params=params, timeout=60)
            if resp.status_code == 429 or resp.status_code >= 500:
                raise requests.HTTPError(f"HTTP {resp.status_code}", response=resp)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as err:
            last_error = err
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"USGS request failed after {tries} tries: {last_error}")


def fetch_daily(
    site_id: str,
    parameter_code: str = DISCHARGE,
    statistic_id: str = MEAN,
    start: str = "2000-01-01",
    end: str = "..",
    api_key: str | None = None,
    page_size: int = 1000,
    max_pages: int = 200,
) -> pd.DataFrame:
    """Return daily values for one gauge as a DataFrame.

    Columns: time (datetime), value (float), unit (str), approval (str).
    `end=".."` means "up to the most recent value".
    """
    api_key = api_key or os.getenv("USGS_API_KEY") or "DEMO_KEY"
    if api_key == "DEMO_KEY":
        print("Note: using DEMO_KEY (very low rate limit). Set USGS_API_KEY for real use.")

    first_params = {
        "monitoring_location_id": normalize_site_id(site_id),
        "parameter_code": parameter_code,
        "statistic_id": statistic_id,
        "datetime": f"{start}/{end}",
        "limit": page_size,
        "f": "json",
        "api_key": api_key,
    }

    rows: list[dict] = []
    url, params, page = BASE_URL, first_params, 0
    while url and page < max_pages:
        data = _get_with_retry(url, params)
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            try:
                value = float(props.get("value"))
            except (TypeError, ValueError):
                continue  # skip missing / non-numeric readings
            approval = props.get("approval_status") or []
            rows.append(
                {
                    "time": props.get("time"),
                    "value": value,
                    "unit": props.get("unit_of_measure"),
                    "approval": ",".join(approval) if isinstance(approval, list) else str(approval),
                }
            )
        # The API pages results. Follow the "next" link until there isn't one.
        # The next link does not carry the API key, so we add it again.
        next_links = [l for l in data.get("links", []) if l.get("rel") == "next"]
        url = next_links[0]["href"] if next_links and data.get("features") else None
        params = {"api_key": api_key}
        page += 1

    if not rows:
        raise ValueError(
            f"No data returned for {site_id} (parameter {parameter_code}). Check that the "
            "site ID is right, that this gauge measures that parameter, and that your "
            "start date isn't after its last reading."
        )

    df = pd.DataFrame(rows)
    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)
    return df
