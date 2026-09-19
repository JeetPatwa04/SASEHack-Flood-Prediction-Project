"""Client and snapshot job for the NWS National Water Prediction Service (NWPS) API.

Why snapshots? NWPS keeps NO forecast history, so the only way to compare our
model against the official forecast later is to save each forecast ourselves,
starting now. Run `snapshot` on a schedule (hourly is good).

Docs: https://api.water.noaa.gov/nwps/v1/docs/
NOTE: the service is not supported 24/7 and can change without notice, so this
script logs failures and keeps going instead of crashing.

Usage (from the repo root):
    python -m backend.pipeline.nwps gauge  <GAUGE_ID>            # print gauge metadata (thresholds etc.)
    python -m backend.pipeline.nwps snapshot <GAUGE_ID> [<GAUGE_ID> ...]

Check the docs page for exactly which identifier the endpoints accept.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE_URL = "https://api.water.noaa.gov/nwps/v1"
HEADERS = {
    "User-Agent": os.getenv(
        "NWPS_USER_AGENT", "flood-forecast-hackathon (set NWPS_USER_AGENT to a contact email)"
    )
}


def get_json(path: str, timeout: int = 60) -> dict:
    resp = requests.get(f"{BASE_URL}{path}", headers=HEADERS, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def get_gauge(gauge_id: str) -> dict:
    """Metadata for one gauge (location, flood category levels, etc.)."""
    return get_json(f"/gauges/{gauge_id}")


def get_stageflow(gauge_id: str) -> dict:
    """Observed AND forecast stage/flow for one gauge."""
    return get_json(f"/gauges/{gauge_id}/stageflow")


def snapshot(gauge_ids: list[str], out_dir: str = "data/raw/nwps") -> int:
    """Save the current stageflow forecast for each gauge. Returns the number saved."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    saved = 0
    for gid in gauge_ids:
        try:
            payload = {
                "fetched_at": stamp,
                "gauge_id": gid,
                "stageflow": get_stageflow(gid),
            }
            folder = Path(out_dir) / gid
            folder.mkdir(parents=True, exist_ok=True)
            (folder / f"{stamp}.json").write_text(json.dumps(payload))
            # Metadata (flood thresholds) changes rarely; keep the latest copy.
            (folder / "metadata.json").write_text(json.dumps(get_gauge(gid)))
            saved += 1
            print(f"[{stamp}] saved {gid}")
        except Exception as err:  # keep going if one gauge fails
            print(f"[{stamp}] FAILED {gid}: {err}", file=sys.stderr)
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gauge", help="print metadata for one gauge")
    g.add_argument("gauge_id")
    s = sub.add_parser("snapshot", help="save current forecasts for gauges")
    s.add_argument("gauge_ids", nargs="+")
    s.add_argument("--out", default="data/raw/nwps")
    args = parser.parse_args()

    if args.cmd == "gauge":
        print(json.dumps(get_gauge(args.gauge_id), indent=2)[:6000])
    else:
        n = snapshot(args.gauge_ids, args.out)
        sys.exit(0 if n else 1)


if __name__ == "__main__":
    main()
