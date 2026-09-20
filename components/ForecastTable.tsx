"use client";
// A table comparing OUR forecast with the official NWS forecast at the same moments.
import type { ChartGauge } from "./ForecastChart";

const C = { surface: "#161b22", border: "#21262d", text: "#e6edf3", muted: "#7d8590", better: "#3fb950", worse: "#f0883e" };
const ET = "America/New_York";
const ms = (s: string) => new Date(s).getTime();
const etWhen = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "numeric", day: "numeric" }).format(d);
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric" }).format(d);
  return `${day} ${hour}`;
};

function interpolate(points: { x: number; y: number }[], x: number): number | null {
  if (points.length < 2 || x < points[0].x || x > points[points.length - 1].x) return null;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) {
      const a = points[i - 1], b = points[i];
      return b.x === a.x ? b.y : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  return null;
}

/** For each of our forecast times: our number, the NWS number at the same time, and the difference. */
export function compareAtLeads(g: ChartGauge, leads: number[] = [6, 12, 24, 48]) {
  const nws = g.nws_forecast.map((p) => ({ x: ms(p.valid_at), y: p.stage_ft })).sort((a, b) => a.x - b.x);
  return g.forecast.filter((f) => leads.includes(f.lead_hours)).map((f) => {
    const n = interpolate(nws, ms(f.valid_at));
    return { lead_hours: f.lead_hours, valid_at: f.valid_at, ours: f.median_ft, low: f.low_ft, high: f.high_ft,
             nws: n, diff: n === null ? null : f.median_ft - n };
  });
}

export default function ForecastTable({ gauge, leads }: { gauge: ChartGauge; leads?: number[] }) {
  const rows = compareAtLeads(gauge, leads);
  const cell = { padding: "6px 8px", textAlign: "right" as const };
  const head = { ...cell, color: C.muted, fontWeight: 500, borderBottom: `1px solid ${C.border}` };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>OURS vs NWS AT EACH LEAD TIME (ft)</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: C.text }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>Time (ET)</th><th style={head}>Ahead</th>
              <th style={head}>Our forecast (likely range)</th><th style={head}>NWS forecast</th><th style={head}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lead_hours}>
                <td style={{ ...cell, textAlign: "left", color: C.muted }}>{etWhen(r.valid_at)}</td>
                <td style={cell}>+{r.lead_hours} h</td>
                <td style={{ ...cell, fontWeight: 600 }}>{r.ours.toFixed(2)} <span style={{ color: C.muted, fontWeight: 400 }}>({r.low.toFixed(2)} to {r.high.toFixed(2)})</span></td>
                <td style={cell}>{r.nws === null ? "n/a" : r.nws.toFixed(2)}</td>
                <td style={cell}>{r.diff === null ? "n/a" : `${r.diff >= 0 ? "+" : ""}${r.diff.toFixed(2)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
        A positive difference means we forecast a higher river level than NWS. NWS publishes a point every 6 hours, so its value at other times is interpolated.
      </div>
    </div>
  );
}
