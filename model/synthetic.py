"""A FAKE river, for testing the scripts without internet or a real gauge.

Rain falls at random, soaks into a "soil" store, and drains out through a fast
and a slow channel. It is NOT real data and NOT a hydrology model. Never report
its results as real. Use it to check that your code runs.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def make_synthetic_river(days: int = 3650, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    time = pd.date_range("2010-01-01", periods=days, freq="D")
    doy = time.dayofyear.to_numpy()
    season = 1 + 0.5 * np.sin(2 * np.pi * (doy - 60) / 365.25)  # wetter in spring

    rain = np.where(rng.random(days) < 0.28 * season, rng.exponential(9, days) * season, 0.0)
    storms = rng.random(days) < 0.004  # rare big storms create the floods
    rain = rain + storms * rng.uniform(50, 130, days)

    wetness, quick, slow = 0.3, 0.0, 0.0
    flow = np.empty(days)
    for i in range(days):
        wetness = min(1.0, wetness * 0.96 + rain[i] / 80)
        quick = quick * 0.55 + rain[i] * (0.2 + 0.8 * wetness) * 0.9
        slow = slow * 0.965 + rain[i] * wetness * 0.25
        flow[i] = 50 + quick * 12 + slow * 8
    flow *= rng.lognormal(0, 0.05, days)

    return pd.DataFrame({"time": time, "value": flow, "rain_mm": rain})
