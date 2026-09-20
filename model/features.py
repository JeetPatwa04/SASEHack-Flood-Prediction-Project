"""Turn hourly stage and rain series into model inputs. Used by training AND live forecasting."""
import numpy as np
import pandas as pd


def load_hourly(site):
    """Read a gauge's hourly file and put it on a complete hourly time grid."""
    df = pd.read_csv(f"data/raw/hourly/{site}.csv", parse_dates=["time"], index_col="time")
    df = df.asfreq("h")
    df["stage_ft"] = df["stage_ft"].interpolate(limit=3)  # fill gaps of up to 3 hours only
    return df


def make_features(stage, rain, up_stage=None):
    """One row per hour, using ONLY information known at that hour."""
    f = pd.DataFrame(index=stage.index)
    f["stage"] = stage
    for h in (1, 3, 6, 12, 24):
        f[f"d{h}"] = stage - stage.shift(h)          # how fast the river is rising or falling
    f["max24"] = stage.rolling(24, min_periods=12).max()
    f["min24"] = stage.rolling(24, min_periods=12).min()
    for w in (6, 12, 24, 48, 72):
        f[f"rain{w}"] = rain.rolling(w, min_periods=max(1, w // 2)).sum()   # rain over the past w hours
    if up_stage is not None:
        up_stage = up_stage.reindex(stage.index)
        f["up"] = up_stage
        for h in (3, 6, 12):
            f[f"up_d{h}"] = up_stage - up_stage.shift(h)  # is the upstream gauge rising?
    doy = stage.index.dayofyear
    f["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    f["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    return f