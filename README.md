# SASEHack-Flood-Prediction-Project

Flood Forecasting with ML: Project Overview

Concept
A full-stack web app that uses machine learning to predict how high rivers will get over the next few days
Built entirely on free, real-time public data

How It Works
Pulls live and historical streamflow readings from USGS gauges
Combines them with rainfall observations and forecasts
The model learns how upstream conditions and incoming rain drive downstream water levels

Predictions
Forecasts river level or discharge 6 to 72 hours ahead for each gauge
Includes an uncertainty range with every prediction
Converts predictions into the chance of reaching official flood stages (minor, moderate, major)

Benchmarking
Compares our model against the National Weather Service's official forecasts
Also compares against the National Water Model
Lets users see how our predictions stack up in the same view

Tech Stack
Data ingestion: scheduled pipeline pulling from USGS, NWS, and weather sources
Model service: trains and serves the forecasting model
API: connects the model and data to the front end
Front end: interactive map and dashboard where users pick a gauge and see observed levels, our forecast, the official forecast, and flood risk together

Design and UX
Inspired by a monitoring-station or emergency-broadcast style

Data Sources
USGS Water Data API: observed streamflow and gauge height
NWPS API: official forecasts and flood thresholds
National Water Model: historical and forecast streamflow
Open-Meteo: historical and forecast rainfall
