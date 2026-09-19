# Setup: model, data pipeline, and mock API

> Student project. Not an official flood warning. For real decisions, use weather.gov.

Run every command from the repo root, using `python -m ...` exactly as shown.

## First-time setup

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Offline check with a FAKE river (no internet or key needed)

```bash
python -m model.explore_gauge --synthetic
python -m model.baseline --synthetic --use-rain
```

## With real data

```bash
export USGS_API_KEY=your_key      # free: https://api.waterdata.usgs.gov/signup/  (Windows: set USGS_API_KEY=...)
python -m model.explore_gauge --site 01646500      # example gauge only; the team picks the real ones
python -m model.baseline --csv data/raw/USGS-01646500_daily.csv --horizons 1 2 3
```

## Folders

| Folder | Owner | What's in it |
| --- | --- | --- |
| `model/` | Nadimul | `explore_gauge.py`, `baseline.py`, `synthetic.py` |
| `backend/pipeline/` | Viet | `usgs.py` (observations), `nwps.py` (official forecast snapshots) |
| `backend/api/` | Viet | `main.py` is a MOCK API. Replace endpoints with real data one at a time |
| `frontend/` | Jeetsuki, Selina | React + TypeScript app |
| `data/` | | `raw/` and `plots/` stay local (git-ignored). `results/` is committed |

Try the mock API: `uvicorn backend.api.main:app --reload`, then open http://127.0.0.1:8000/docs

## Start the official-forecast snapshots early

NWPS keeps no forecast history. Saving its forecasts on a schedule is the only way to
compare our model to the official one later:

```bash
python -m backend.pipeline.nwps gauge <GAUGE_ID>            # look at the metadata first
python -m backend.pipeline.nwps snapshot <GAUGE_ID> ...     # run this hourly
```

Check https://api.water.noaa.gov/nwps/v1/docs/ for which identifier the endpoints accept.

## What has and hasn't been tested

- Tested offline: the model scripts on the fake river, the mock API, and the USGS paging
  logic and snapshot writer (both against mocked responses).
- NOT yet tested against the live USGS and NWPS services. Expect small fixes on the first
  real run, and tell the team what you changed.

## Rules

- Never commit API keys. Use environment variables (see `.env.example`).
- Use only the new `api.waterdata.usgs.gov` API. Do not use `waterservices.usgs.gov`.
- Credit data sources in the app footer: USGS, NOAA/NWS, Open-Meteo (CC BY 4.0), OpenStreetMap.
- No third-party franchise assets (names, art, fonts).
