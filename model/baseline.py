"""STEP 2: the simplest honest forecast, then a first ML model with uncertainty.

Run from the repo root (after explore_gauge saved a CSV):
    python -m model.baseline --csv data/raw/USGS-01646500_daily.csv --horizons 1 2 3
    python -m model.baseline --synthetic --use-rain     # no internet needed

What it does
1. PERSISTENCE baseline: "tomorrow will equal today". Every model must beat this.
2. GRADIENT BOOSTING with quantile loss: predicts a low (10%), middle (50%) and
   high (90%) estimate. We predict the CHANGE from today's value, so "no change"
   (persistence) is where the model starts and it only learns corrections.
3. Scores everything on a held-out TEST period that comes AFTER the training
   period (never a random split: that would leak the future into training).
4. Scores the highest-flow days separately, because floods are rare and average
   scores can hide a model that misses every flood.

Note: this starter works in DAYS. The final app will use hourly data.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

from model.synthetic import make_synthetic_river

LAGS = (1, 2, 3, 7, 14)
QUANTILES = (0.1, 0.5, 0.9)


# ---------- data prep ----------
def regularize(df: pd.DataFrame) -> pd.DataFrame:
    """One row per calendar day. Fill gaps of up to 3 days; leave longer gaps empty."""
    d = df.copy()
    d["time"] = pd.to_datetime(d["time"])
    d = d.sort_values("time").drop_duplicates("time").set_index("time")
    d = d.asfreq("D")
    d["value"] = d["value"].interpolate(limit=3)
    if "rain_mm" in d:
        d["rain_mm"] = d["rain_mm"].fillna(0.0)
    return d.reset_index()


def build_features(df: pd.DataFrame, horizon: int, use_rain: bool = False) -> pd.DataFrame:
    """Turn a time series into a table: one row per day, using ONLY information
    known on that day, plus the target (the level `horizon` days later)."""
    v = df["value"]
    feats = pd.DataFrame({"time": df["time"], "now": v})
    for k in LAGS:
        feats[f"lag_{k}"] = v.shift(k)
    feats["change_1d"] = v - v.shift(1)
    feats["mean_7d"] = v.rolling(7).mean()
    feats["max_14d"] = v.rolling(14).max()
    doy = df["time"].dt.dayofyear
    feats["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    feats["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    if use_rain and "rain_mm" in df:
        for w in (1, 3, 7):
            feats[f"rain_sum_{w}d"] = df["rain_mm"].rolling(w).sum()
    feats["target_level"] = v.shift(-horizon)
    return feats.dropna().reset_index(drop=True)


def time_split(feats: pd.DataFrame, horizon: int, train_frac: float = 0.7):
    """Train on the first part, test on the last part, with a gap so that no
    training target reaches into the test period."""
    cut = int(len(feats) * train_frac)
    train = feats.iloc[: max(cut - horizon, 0)]
    test = feats.iloc[cut:]
    return train, test


# ---------- models ----------
def fit_quantile_models(X: pd.DataFrame, y_change: pd.Series) -> dict:
    models = {}
    for q in QUANTILES:
        m = GradientBoostingRegressor(
            loss="quantile", alpha=q, n_estimators=200, max_depth=3,
            learning_rate=0.05, subsample=0.8, random_state=0,
        )
        models[q] = m.fit(X, y_change)
    return models


def predict_levels(models: dict, X: pd.DataFrame) -> np.ndarray:
    """Return an (n, 3) array of low/median/high LEVELS."""
    now = X["now"].to_numpy()
    preds = np.column_stack([now + models[q].predict(X) for q in QUANTILES])
    return np.sort(preds, axis=1)  # guard against the estimates crossing each other


# ---------- scoring ----------
def rmse(y, p): return float(np.sqrt(np.mean((y - p) ** 2)))
def mae(y, p): return float(np.mean(np.abs(y - p)))
def nse(y, p): return float(1 - np.sum((y - p) ** 2) / np.sum((y - np.mean(y)) ** 2))


def score(y: np.ndarray, persist: np.ndarray, pred: np.ndarray, band: np.ndarray) -> dict:
    mse_p, mse_m = np.mean((y - persist) ** 2), np.mean((y - pred) ** 2)
    return {
        "n_days": int(len(y)),
        "persistence": {"rmse": rmse(y, persist), "mae": mae(y, persist), "nse": nse(y, persist)},
        "model": {"rmse": rmse(y, pred), "mae": mae(y, pred), "nse": nse(y, pred)},
        # > 0 means the model beats persistence; 1 would be perfect.
        "skill_vs_persistence": float(1 - mse_m / mse_p) if mse_p > 0 else None,
        # Should be near 80% because the band is the 10th to 90th percentile.
        "band_coverage": float(np.mean((y >= band[:, 0]) & (y <= band[:, 1]))),
    }


def print_report(title: str, s: dict) -> None:
    print(f"\n  {title} ({s['n_days']} days)")
    print(f"    {'':<13}{'RMSE':>10}{'MAE':>10}{'NSE':>8}")
    for name in ("persistence", "model"):
        m = s[name]
        print(f"    {name:<13}{m['rmse']:>10,.1f}{m['mae']:>10,.1f}{m['nse']:>8.3f}")
    print(f"    Skill vs persistence: {s['skill_vs_persistence']:+.3f}   (above 0 = beats the baseline)")
    print(f"    80% band actually contains the truth {s['band_coverage']:.0%} of the time (aim: ~80%)")


def plot_test(test: pd.DataFrame, preds: np.ndarray, horizon: int, path: Path, show: bool) -> None:
    last = test.tail(365)
    p = preds[-len(last):]
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.fill_between(last["time"], p[:, 0], p[:, 2], alpha=0.25, label="80% range (10th-90th)")
    ax.plot(last["time"], last["target_level"], color="black", linewidth=1.2, label="actual")
    ax.plot(last["time"], last["now"], color="gray", linestyle="--", linewidth=1, label="persistence")
    ax.plot(last["time"], p[:, 1], color="tab:blue", linewidth=1.2, label="model (median)")
    ax.set_title(f"Forecast {horizon} day(s) ahead: last year of the test period")
    ax.set_ylabel("Flow")
    ax.legend(loc="upper left")
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=130)
    print(f"  Saved plot: {path}")
    if show:
        plt.show()
    plt.close(fig)


def run_horizon(df: pd.DataFrame, horizon: int, name: str, use_rain: bool, show: bool) -> dict:
    feats = build_features(df, horizon, use_rain)
    train, test = time_split(feats, horizon)
    feature_cols = [c for c in feats.columns if c not in ("time", "target_level")]

    y_change = train["target_level"] - train["now"]
    models = fit_quantile_models(train[feature_cols], y_change)
    preds = predict_levels(models, test[feature_cols])

    y = test["target_level"].to_numpy()
    persist = test["now"].to_numpy()
    band = preds[:, [0, 2]]

    # "High flow" = days whose actual level is in the top 5% of what TRAINING saw.
    high_cut = float(train["target_level"].quantile(0.95))
    hi = y >= high_cut

    print(f"\n===== Horizon: {horizon} day(s) ahead | train {len(train)} days, test {len(test)} days =====")
    print(f"  Features used: {', '.join(feature_cols)}")
    result = {"horizon_days": horizon, "used_rain": use_rain, "high_flow_cutoff": high_cut,
              "all_days": score(y, persist, preds[:, 1], band)}
    print_report("ALL test days", result["all_days"])
    if hi.sum() >= 5:
        result["high_flow_days"] = score(y[hi], persist[hi], preds[hi, 1], band[hi])
        print_report("HIGH-FLOW test days (top 5% of training levels)", result["high_flow_days"])
    else:
        print(f"\n  Only {int(hi.sum())} high-flow days in the test period: too few to score fairly.")
        result["high_flow_days"] = None

    plot_test(test, preds, horizon, Path("data/plots") / f"{name}_baseline_h{horizon}.png", show)
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", help="CSV from explore_gauge (columns: time,value)")
    ap.add_argument("--synthetic", action="store_true", help="use a fake river (no internet)")
    ap.add_argument("--horizons", type=int, nargs="+", default=[1], help="days ahead, e.g. 1 2 3")
    ap.add_argument("--use-rain", action="store_true", help="add rainfall features if a rain_mm column exists")
    ap.add_argument("--no-show", action="store_true")
    args = ap.parse_args()

    if args.synthetic:
        raw, name = make_synthetic_river(), "synthetic"
        print("Using a SYNTHETIC river: for checking code only, not real results.")
    elif args.csv:
        raw, name = pd.read_csv(args.csv), Path(args.csv).stem.replace("_daily", "")
    else:
        ap.error("give --csv <file> or --synthetic")

    df = regularize(raw)
    results = [run_horizon(df, h, name, args.use_rain, not args.no_show) for h in args.horizons]

    out = Path("data/results") / f"{name}_baseline.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2))
    print(f"\nSaved scores: {out}  (Selina's comparison page can read this)")


if __name__ == "__main__":
    main()
