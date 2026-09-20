import type { Backtest, Context, Latest, Scores } from "@/types/flood";
import fallbackLatest from "@/data/latest.json";
import fallbackScores from "@/data/scores.json";

// Live data lives in the GitHub repo (branch: main). Nadimul refreshes it; this reads it on each request.
const BASE =
  process.env.DATA_BASE_URL ??
  "https://raw.githubusercontent.com/JeetPatwa04/SASEHack-Flood-Prediction-Project/main/data/results";

async function getJson<T>(file: string, fallback?: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}/${file}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
    return (await res.json()) as T;
  } catch (err) {
    if (fallback !== undefined) return fallback; // use the copy bundled with the site
    throw err;
  }
}

export const getLatest = () => getJson<Latest>("latest.json", fallbackLatest as unknown as Latest);
export const getScores = () => getJson<Scores>("scores.json", fallbackScores as unknown as Scores);
export const getContext = () => getJson<Context | null>("context.json", null);
export const getBacktest = (siteId: string) => getJson<Backtest>(`backtest/${siteId}.json`);

export const isValidSiteId = (id: string) => /^USGS-\d{8,15}$/.test(id);