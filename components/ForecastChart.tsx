"use client";
// Ours vs NWS: observed level, our forecast + likely range, the official NWS forecast, and flood levels.
// Time is spaced by real time (not by data row), and our forecast starts at "now" so the lines connect.
import { ComposedChart, Line, Area, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Point = { time: string; stage_ft: number };
export interface ChartGauge {
  name: string;
  thresholds_ft: { action: number; minor: number; moderate: number; major: number };
  current: { time: string; stage_ft: number };
  observed: Point[];
  forecast: { valid_at: string; lead_hours: number; low_ft: number; median_ft: number; high_ft: number }[];
  nws_forecast: { valid_at: string; stage_ft: number }[];
  nws_issued_at?: string | null;
}

const C = {
  surface: "#161b22", border: "#21262d", text: "#e6edf3", muted: "#7d8590",
  observed: "#58a6ff", ours: "#3fb950", band: "#3fb95044", nws: "#d2a8ff",
  action: "#d29922", minor: "#f0883e", moderate: "#f85149", major: "#ff7b72",
};
const LEVELS = [
  { key: "action", short: "Action", label: "Action stage" },
  { key: "minor", short: "Minor", label: "Minor flood" },
  { key: "moderate", short: "Moderate", label: "Moderate flood" },
  { key: "major", short: "Major", label: "Major flood" },
] as const;

const H = 3600e3;
const ET = "America/New_York";
const ms = (s: string) => new Date(s).getTime();
const etHour = (t: number) => Number(new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", hourCycle: "h23" }).format(new Date(t)));
const etDay = (t: number) => new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "numeric", day: "numeric" }).format(new Date(t));
const etFull = (t: number) => `${etDay(t)} ${new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(new Date(t))} ET`;

type Row = { t: number; observed?: number; median?: number; range?: [number, number]; nws?: number };

function prepare(g: ChartGauge) {
  const now = ms(g.current.time);
  const cur = g.current.stage_ft;
  const lastForecast = g.forecast.length ? Math.max(...g.forecast.map((f) => ms(f.valid_at))) : now + 48 * H;
  const xMax = lastForecast + 3 * H;                       // show NWS only as far as our forecast reaches
  const xMin = g.observed.length ? Math.min(...g.observed.map((o) => ms(o.time))) : now - 72 * H;

  const rows = new Map<number, Row>();
  const at = (t: number) => { let r = rows.get(t); if (!r) { r = { t }; rows.set(t, r); } return r; };
  g.observed.forEach((o) => { at(ms(o.time)).observed = o.stage_ft; });
  const start = at(now); start.median = cur; start.range = [cur, cur];   // anchor the forecast at "now"
  g.forecast.forEach((f) => { const r = at(ms(f.valid_at)); r.median = f.median_ft; r.range = [f.low_ft, f.high_ft]; });
  g.nws_forecast.forEach((n) => { const t = ms(n.valid_at); if (t >= xMin && t <= xMax) at(t).nws = n.stage_ft; });
  const data = [...rows.values()].sort((a, b) => a.t - b.t);

  const values = data.flatMap((r) => [r.observed, r.median, r.nws, r.range?.[0], r.range?.[1]]).filter((v): v is number => typeof v === "number");
  const dMin = Math.min(...values), dMax = Math.max(...values);
  const reach = dMax + Math.max(2, 0.35 * (dMax - dMin));
  const shown = LEVELS.filter((l) => g.thresholds_ft[l.key] <= reach);         // draw flood lines only when the river is within reach
  const yMax = Math.ceil(Math.max(dMax + 0.5, ...shown.map((l) => g.thresholds_ft[l.key] + 0.5)));
  const yMin = dMin <= 3.5 ? 0 : Math.floor(dMin - 0.5);

  const ticks: { t: number; label: string }[] = [];
  for (let t = Math.ceil(xMin / H) * H; t <= xMax; t += H) {
    const h = etHour(t);
    if (h === 0) ticks.push({ t, label: etDay(t) });
    else if (h === 12) ticks.push({ t, label: "noon" });
  }
  const next = LEVELS.find((l) => g.thresholds_ft[l.key] > cur);
  const note = next
    ? `Next flood level: ${next.label} at ${g.thresholds_ft[next.key].toFixed(1)} ft (${(g.thresholds_ft[next.key] - cur).toFixed(1)} ft above the current level).`
    : "The river is above every official flood level.";
  return { data, now, xMin, xMax, yMin, yMax, shown, ticks, note };
}

type TipItem = { dataKey?: string | number; name?: string; value?: number | [number, number]; color?: string };
function Tip({ active, payload, label }: { active?: boolean; payload?: TipItem[]; label?: number }) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: C.muted, marginBottom: 6 }}>{etFull(label)}</div>
      {payload.map((p) => p.value != null && p.dataKey !== undefined && (
        <div key={p.dataKey} style={{ color: p.color || C.text, marginBottom: 2 }}>
          {p.name}: {Array.isArray(p.value) ? `${p.value[0].toFixed(2)} to ${p.value[1].toFixed(2)} ft` : `${p.value.toFixed(2)} ft`}
        </div>
      ))}
    </div>
  );
}

export default function ForecastChart({ gauge, height = 300, width }: { gauge: ChartGauge; height?: number; width?: number }) {
  const { data, now, xMin, xMax, yMin, yMax, shown, ticks, note } = prepare(gauge);
  const legend = [
    { label: "Observed", color: C.observed, line: "solid" }, { label: "Our forecast", color: C.ours, line: "solid" },
    { label: "Our likely range", color: C.band, line: "band" },
    { label: gauge.nws_forecast.length ? "NWS forecast" : "NWS forecast (unavailable)", color: C.nws, line: "dotted" },
  ];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>River Level Forecast: ours vs NWS</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
        Past 72 h observed + 48 h forecast.{gauge.nws_issued_at ? ` NWS forecast issued ${etFull(ms(gauge.nws_issued_at))}.` : ""}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        {legend.map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {l.line === "band" ? <div style={{ width: 28, height: 10, background: l.color, borderRadius: 2 }} />
              : <div style={{ width: 28, height: 0, borderTop: `2px ${l.line} ${l.color}` }} />}
            <span style={{ color: C.muted, fontSize: 11 }}>{l.label}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width={width ?? "100%"} height={height}>
        <ComposedChart data={data} margin={{ top: 22, right: 72, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis type="number" dataKey="t" scale="time" domain={[xMin, xMax]} allowDataOverflow ticks={ticks.map((k) => k.t)}
                 tickFormatter={(t: number) => ticks.find((k) => k.t === t)?.label ?? ""} tick={{ fill: C.muted, fontSize: 11 }} />
          <YAxis domain={[yMin, yMax]} allowDataOverflow tick={{ fill: C.muted, fontSize: 11 }} unit=" ft" width={58} />
          <Tooltip content={<Tip />} />
          {shown.map((l) => (
            <ReferenceLine key={l.key} y={gauge.thresholds_ft[l.key]} stroke={C[l.key]} strokeDasharray="4 3"
                           label={{ value: `${l.short} ${gauge.thresholds_ft[l.key]} ft`, fill: C[l.key], fontSize: 10, position: "right" }} />
          ))}
          <ReferenceLine x={now} stroke={C.muted} strokeDasharray="2 3" label={{ value: "Now", fill: C.muted, fontSize: 11, position: "top" }} />
          <Area dataKey="range" name="Our likely range" fill={C.band} stroke="none" connectNulls isAnimationActive={false} />
          <Line dataKey="observed" name="Observed" stroke={C.observed} dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
          <Line dataKey="nws" name="NWS forecast" stroke={C.nws} strokeWidth={1.5} strokeDasharray="2 4" dot={{ r: 3, fill: C.nws, stroke: C.nws, strokeDasharray: "0" }} connectNulls isAnimationActive={false} />
          <Line dataKey="median" name="Our forecast" stroke={C.ours} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{note}</div>
    </div>
  );
}
