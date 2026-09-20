"""Shared settings for the pull, train, and live-forecast scripts."""

HORIZONS = (6, 12, 24, 48)   # hours ahead
QUANTILES = (0.1, 0.5, 0.9)  # low, middle, and high estimates

# The team gauge directly upstream of each gauge (None = start of our chain).
# Inferred from drainage areas and river names, so CONFIRM ON A MAP.
UPSTREAM = {
    "USGS-03524000": None,             # Clinch River at Cleveland
    "USGS-03527000": "USGS-03524000",  # Clinch River at Speers Ferry
    "USGS-02026000": None,             # James River at Bent Creek
    "USGS-02035000": "USGS-02026000",  # James River at Cartersville
    "USGS-02037500": "USGS-02035000",  # James River near Richmond
}
CHAIN = {
    "USGS-03524000": "Clinch River", "USGS-03527000": "Clinch River",
    "USGS-02026000": "James River", "USGS-02035000": "James River", "USGS-02037500": "James River",
}