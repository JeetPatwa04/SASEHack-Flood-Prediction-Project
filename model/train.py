"""Train the flood forecast models and score them on a held-out final stretch of time.

    python -m model.train
    python -m model.train --test-days 300
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from model.config import HORIZONS, QUANTILES, UPSTREAM
from model.features import load_hourly, make_features

BACKTEST_LEAD = 24  # the lead time we save a full backtest chart for


def new_model(q):
    return HistGradientBoostingRegressor(loss="quantile", quantile=q, max_iter=250, learning_rate=0.06,
                                         max_leaf_nodes=24, min_samples_leaf=40, l2_regularization=1.0, random_state=0)


def train_gauge(site, test_days):
    df = load_hourly(site)
    df = df.loc[: df["rain_mm"].last_valid_index()]  # rain data ends a week before today
    up_site = UPSTREAM.get(site)
    up = load_hourly(up_site)["stage_ft"] if up_site else None
    stage = df["stage_ft"]
    X = make_features(stage, df["rain_mm"], up)
    cutoff = df.index[-1] - pd.Timedelta(days=test_days)
    high_cut = float(stage[stage.index < cutoff].quantile(0.95))  # "high water" = top 5% of what training saw

    models, metrics, backtest = {}, {}, None
    for h in HORIZONS:
        y_delta = stage.shift(-h) - stage
        ok = X["stage"].notna() & y_delta.notna()
        train = ok & (df.index < cutoff - pd.Timedelta(hours=h))  # gap so no training target reaches into the test period
        test = ok & (df.index >= cutoff)
        if train.sum() < 2000 or test.sum() < 200:
            print(f"  {site} {h}h: not enough data (train {int(train.sum())}, test {int(test.sum())}), skipping")
            continue
        models[h] = {q: new_model(q).fit(X[train], y_delta[train]) for q in QUANTILES}
        now = stage[test].to_numpy()
        preds = np.sort(np.column_stack([now + models[h][q].predict(X[test]) for q in QUANTILES]), axis=1)
        actual = stage.shift(-h)[test].to_numpy()
        hi = actual >= high_cut

        def mae(a, p):
            return float(np.mean(np.abs(a - p)))

        m = {"n": int(test.sum()), "n_high": int(hi.sum()),
             "mae_ours": mae(actual, preds[:, 1]), "mae_persistence": mae(actual, now),
             "coverage_80": float(np.mean((actual >= preds[:, 0]) & (actual <= preds[:, 2])))}
        m["skill_pct"] = 100 * (1 - m["mae_ours"] / m["mae_persistence"]) if m["mae_persistence"] > 0 else None
        if hi.sum() >= 5:
            m["mae_ours_high"], m["mae_persistence_high"] = mae(actual[hi], preds[hi, 1]), mae(actual[hi], now[hi])
            m["coverage_80_high"] = float(np.mean((actual[hi] >= preds[hi, 0]) & (actual[hi] <= preds[hi, 2])))
        metrics[h] = {k: (round(v, 3) if isinstance(v, float) else v) for k, v in m.items()}
        if h == BACKTEST_LEAD:
            idx = stage.index[test] + pd.Timedelta(hours=h)   # time the forecast is FOR
            backtest = {"site_id": site, "lead_hours": h, "time": [t.strftime("%Y-%m-%dT%H:%M:%SZ") for t in idx],
                        "actual": np.round(actual, 2).tolist(), "persistence": np.round(now, 2).tolist(),
                        "low": np.round(preds[:, 0], 2).tolist(), "median": np.round(preds[:, 1], 2).tolist(),
                        "high": np.round(preds[:, 2], 2).tolist()}
    return {"features": list(X.columns), "models": models}, metrics, backtest, high_cut


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--test-days", type=int, default=365)
    args = ap.parse_args()
    Path("models").mkdir(exist_ok=True)
    Path("data/results/backtest").mkdir(parents=True, exist_ok=True)

    scores = {"generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
              "test_days": args.test_days, "gauges": {}}
    for site in UPSTREAM:
        print(f"Training {site} ...")
        bundle, metrics, backtest, high_cut = train_gauge(site, args.test_days)
        if not metrics:
            continue
        joblib.dump(bundle, f"models/{site}.joblib")
        scores["gauges"][site] = {"high_water_ft": round(high_cut, 2), "horizons": metrics}
        if backtest:
            Path(f"data/results/backtest/{site}.json").write_text(json.dumps(backtest))
        print(f"  {'lead':>5} {'MAE ours':>9} {'MAE no-change':>14} {'better by':>10} {'80% band hit':>13} {'high-water MAE (ours vs no-change)':>36}")
        for h, m in metrics.items():
            hi = f"{m['mae_ours_high']:.2f} vs {m['mae_persistence_high']:.2f}  (n={m['n_high']})" if "mae_ours_high" in m else "too few high-water hours"
            print(f"  {h:>4}h {m['mae_ours']:>8.2f}  {m['mae_persistence']:>13.2f}  {m['skill_pct']:>8.0f}%  {m['coverage_80']:>12.0%}  {hi:>36}")

    Path("data/results/scores.json").write_text(json.dumps(scores, indent=2))
    print("\nSaved: data/results/scores.json, data/results/backtest/, models/")


if __name__ == "__main__":
    main()