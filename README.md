# **FloodWatch!**

Flood Forecasting with ML: Project Overview

Here is our deployed website: https://floodwatchsasehack.vercel.app/

Concept:
A full-stack web app that uses machine learning to predict how high rivers will get over the next few days
Built entirely on free, real-time public data

How It Works:
Pulls live and historical streamflow readings from USGS gauges
Combines them with rainfall observations and forecasts
The model learns how upstream conditions and incoming rain drive downstream water levels

Predictions:
Forecasts river level or discharge 6 to 72 hours ahead for each gauge
Includes an uncertainty range with every prediction
Converts predictions into the chance of reaching official flood stages (minor, moderate, major)

Benchmarking:
Compares our model against the National Weather Service's official forecasts
Also compares against the National Water Model
Lets users see how our predictions stack up in the same view

Tech Stack:
Data ingestion: scheduled pipeline pulling from USGS, NWS, and weather sources
Model service: trains and serves the forecasting model
API: connects the model and data to the front end
Front end: interactive map and dashboard where users pick a gauge and see observed levels, our forecast, the official forecast, and flood risk together

Design and UX:
Clean, calming, easy to use!

Data Sources:
USGS Water Data API: observed streamflow and gauge height
NWPS API: official forecasts and flood thresholds
National Water Model: historical and forecast streamflow
Open-Meteo: historical and forecast rainfall


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# SASEHack-Flood-Prediction-Project
