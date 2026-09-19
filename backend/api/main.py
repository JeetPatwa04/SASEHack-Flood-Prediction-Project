"""MOCK API so the front-end team can build before real data exists.

Every number here is FAKE. It only follows the agreed JSON shape (see the project
guide's "API contract"). Viet replaces each endpoint with real database queries,
one at a time, without changing the shape.

Run from the repo root:
    uvicorn backend.api.main:app --reload
Then open http://127.0.0.1:8000/docs to see and try every endpoint.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Flood Forecast API (MOCK DATA)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

THRESHOLDS = {"action": 9.0, "minor": 11.0, "moderate": 14.0, "major": 18.0}  # placeholders
GAUGES = {
    "MOCK-001": {"name": "Mock River, upstream", "latitude": 38.98, "longitude": -77.40, "phase": 0.0},
    "MOCK-002": {"name": "Mock River, midstream", "latitude": 38.90, "longitude": -77.20, "phase": 0.6},
    "MOCK-003": {"name": "Mock River, downstream", "latitude": 38.82, "longitude": -77.05, "phase": 1.2},
}
UNIT = "ft"


def _gauge(gauge_id: str) -> dict:
    if gauge_id not in GAUGES:
        raise HTTPException(status_code=404, detail=f"Unknown gauge {gauge_id}")
    return GAUGES[gauge_id]


def _level(hours_from_now: float, phase: float) -> float:
    """A fake river level that rises and falls."""
    return round(9.5 + 3.5 * math.sin((hours_from_now / 30.0) - phase) + 1.2 * math.sin(hours_from_now / 9.0), 2)


def _category(level: float) -> str:
    for name in ("major", "moderate", "minor", "action"):
        if level >= THRESHOLDS[name]:
            return name
    return "none"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)


@app.get("/gauges")
def list_gauges():
    return [
        {"gauge_id": gid, "name": g["name"], "latitude": g["latitude"], "longitude": g["longitude"],
         "current_category": _category(_level(0, g["phase"]))}
        for gid, g in GAUGES.items()
    ]


@app.get("/gauges/{gauge_id}")
def gauge_detail(gauge_id: str):
    g = _gauge(gauge_id)
    return {"gauge_id": gauge_id, "name": g["name"], "latitude": g["latitude"],
            "longitude": g["longitude"], "unit": UNIT, "thresholds": THRESHOLDS}


@app.get("/gauges/{gauge_id}/observations")
def observations(gauge_id: str, hours: int = 72):
    g, now = _gauge(gauge_id), _now()
    return {"gauge_id": gauge_id, "unit": UNIT, "observations": [
        {"time": (now - timedelta(hours=h)).isoformat(), "value": _level(-h, g["phase"])}
        for h in range(hours, -1, -1)
    ]}


@app.get("/gauges/{gauge_id}/forecast")
def forecast(gauge_id: str):
    g, now = _gauge(gauge_id), _now()
    points = []
    for lead in (6, 12, 24, 48, 72):
        mid = _level(lead, g["phase"])
        width = 0.3 + lead * 0.03  # uncertainty grows with lead time
        points.append({"time": (now + timedelta(hours=lead)).isoformat(), "lead_hours": lead,
                       "low": round(mid - width, 2), "median": mid, "high": round(mid + width, 2)})
    worst_median = max(p["median"] for p in points)
    worst_high = max(p["high"] for p in points)
    category = _category(worst_median)
    possible = _category(worst_high)
    label = ("No flooding expected" if possible == "none" else
             f"Likely {category} flooding" if category != "none" else f"Possible {possible} flooding")
    return {"gauge_id": gauge_id, "issued_at": now.isoformat(), "unit": UNIT,
            "thresholds": THRESHOLDS, "forecast": points,
            "risk": {"category": category if category != "none" else possible, "label": label}}


@app.get("/gauges/{gauge_id}/official")
def official(gauge_id: str):
    g, now = _gauge(gauge_id), _now()
    return {"gauge_id": gauge_id, "source": "MOCK NWS forecast", "issued_at": now.isoformat(),
            "unit": UNIT, "forecast": [
                {"time": (now + timedelta(hours=h)).isoformat(), "value": round(_level(h, g["phase"]) + 0.3, 2)}
                for h in range(6, 73, 6)]}


@app.get("/gauges/{gauge_id}/backtest")
def backtest(gauge_id: str):
    g, now = _gauge(gauge_id), _now()
    rows = []
    for d in range(30, 0, -1):
        h = -24 * d
        actual = _level(h, g["phase"])
        rows.append({"time": (now + timedelta(hours=h)).isoformat(), "actual": actual,
                     "ours": round(actual + 0.25 * math.sin(d), 2),
                     "official": round(actual + 0.4 * math.cos(d), 2)})
    return {"gauge_id": gauge_id, "unit": UNIT, "lead_hours": 24, "rows": rows,
            "scores": {"ours": {"rmse": 0.25, "mae": 0.2}, "official": {"rmse": 0.28, "mae": 0.23},
                       "persistence": {"rmse": 0.9, "mae": 0.7}},
            "note": "MOCK numbers for layout only."}
