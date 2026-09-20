export type Category = "none" | "action" | "minor" | "moderate" | "major";

export interface Thresholds { action: number; minor: number; moderate: number; major: number }
export interface ObservedPoint { time: string; stage_ft: number }
export interface ForecastPoint { valid_at: string; lead_hours: number; low_ft: number; median_ft: number; high_ft: number }
export interface NwsPoint { valid_at: string; stage_ft: number }

export interface Gauge {
  site_id: string;
  nws_id: string;
  name: string;
  chain: string;
  upstream_site_id: string | null;
  latitude: number;
  longitude: number;
  thresholds_ft: Thresholds;
  current: { time: string; stage_ft: number; category: Category };
  observed: ObservedPoint[];
  forecast: ForecastPoint[];
  nws_issued_at?: string | null;
  nws_forecast: NwsPoint[];
  risk: { category: Category; label: string; peak_median_ft: number; peak_high_ft: number; prob_minor: number };
  rain_mm?: { past_24h: number; next_24h: number; next_48h: number };
}

export interface Latest { generated_at: string; model_version: string; is_sample_data: boolean; gauges: Gauge[] }

export interface HorizonScore {
  n: number; n_high: number; mae_ours: number; mae_persistence: number; coverage_80: number; skill_pct: number | null;
  mae_ours_high?: number; mae_persistence_high?: number; coverage_80_high?: number;
}
export interface Scores {
  generated_at: string;
  test_days: number;
  gauges: Record<string, { high_water_ft: number; horizons: Record<string, HorizonScore> }>;
}

export interface Backtest {
  site_id: string; lead_hours: number; time: string[];
  actual: number[]; persistence: number[]; low: number[]; median: number[]; high: number[];
}

export interface Crest { date: string; stage_ft: number }
export interface GaugeContext { record_crest: Crest | null; top_crests: Crest[]; impacts: { stage_ft: number; statement: string }[] }
export interface Context { generated_at: string; gauges: Record<string, GaugeContext> }
