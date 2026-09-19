"""STEP 1: pull one gauge's daily history, save it, summarize it, and plot it.

Run from the repo root:
    python -m model.explore_gauge --site 01646500
    python -m model.explore_gauge --synthetic          # no internet needed

Look at the plot and ask: how often does this river rise sharply? Does it have
clear flood events? Is the data recent? Those answers decide if it's a good gauge.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

from model.synthetic import make_synthetic_river
from backend.pipeline.usgs import DISCHARGE, fetch_daily, normalize_site_id


def summarize(df: pd.DataFrame, label: str, real: bool = True) -> None:
    full_days = pd.date_range(df["time"].min(), df["time"].max(), freq="D")
    missing = len(full_days) - len(df)
    p95, p99 = df["value"].quantile([0.95, 0.99])
    peak = df.loc[df["value"].idxmax()]
    age_days = (pd.Timestamp.now().normalize() - df["time"].max()).days

    print(f"\n=== {label} ===")
    print(f"Rows:            {len(df)}")
    print(f"Date range:      {df['time'].min().date()}  to  {df['time'].max().date()}")
    print(f"Missing days:    {missing}  ({missing / max(len(full_days), 1):.1%})")
    if real:
        print(f"Newest reading:  {age_days} days ago")
    print(f"Typical (median): {df['value'].median():,.0f}")
    print(f"95th percentile: {p95:,.0f}   99th percentile: {p99:,.0f}")
    print(f"Highest ever:    {peak['value']:,.0f} on {peak['time'].date()}")
    if "approval" in df:
        print("Data status:     " + ", ".join(f"{k}: {v}" for k, v in df["approval"].value_counts().items()))
    if real and age_days > 5:
        print("WARNING: newest reading is more than 5 days old. Check that the gauge is still active.")


def plot(df: pd.DataFrame, label: str, out_path: Path, show: bool) -> None:
    p95 = df["value"].quantile(0.95)
    fig, axes = plt.subplots(2, 1, figsize=(11, 7))
    for ax, data, title in (
        (axes[0], df, f"{label}: full history"),
        (axes[1], df[df["time"] >= df["time"].max() - pd.Timedelta(days=730)], "Last 2 years"),
    ):
        ax.plot(data["time"], data["value"], linewidth=1)
        ax.axhline(p95, linestyle="--", color="crimson", linewidth=1,
                   label="95th percentile (a stand-in for a flood level)")
        ax.set_title(title)
        ax.set_ylabel("Flow")
        ax.legend(loc="upper left")
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=130)
    print(f"Saved plot: {out_path}")
    if show:
        plt.show()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", default="01646500",
                    help="USGS site number. The default is just an example gauge, not a team decision.")
    ap.add_argument("--start", default="2000-01-01")
    ap.add_argument("--parameter", default=DISCHARGE, help="00060 = flow, 00065 = river level")
    ap.add_argument("--synthetic", action="store_true", help="use a fake river (no internet)")
    ap.add_argument("--no-show", action="store_true", help="save the plot but don't open a window")
    args = ap.parse_args()

    if args.synthetic:
        df, name = make_synthetic_river(), "synthetic"
        label = "SYNTHETIC river (fake data)"
    else:
        site = normalize_site_id(args.site)
        df, name = fetch_daily(site, parameter_code=args.parameter, start=args.start), site
        label = site

    csv_path = Path("data/raw") / f"{name}_daily.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)
    print(f"Saved data: {csv_path}")

    summarize(df, label, real=not args.synthetic)
    plot(df, label, Path("data/plots") / f"{name}_hydrograph.png", show=not args.no_show)


if __name__ == "__main__":
    main()
