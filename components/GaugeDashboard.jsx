import { useState, useEffect } from "react";
import {
  ComposedChart, Line, Area, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import ForecastChart from "./ForecastChart";
import ForecastTable from "./ForecastTable";

// colors — dark theme
const C = {
  bg:        "#0d1117",
  surface:   "#161b22",
  border:    "#21262d",
  text:      "#e6edf3",
  muted:     "#7d8590",
  observed:  "#58a6ff",
  forecast:  "#3fb950",
  band:      "#3fb95030",
  nws:       "#d29922",
  none:      "#3fb950",
  action:    "#d29922",
  minor:     "#f0883e",
  moderate:  "#f85149",
  major:     "#ff7b72",
  rain:      "#79c0ff",
};

// fonts — wired to the same CSS vars ensuring consistency with the rest of the site
const FONT_HEAD = "var(--font-potta), cursive";
const FONT_BODY = "var(--font-mono-flood), monospace";

const CATEGORY_COLOR = { none: C.none, action: C.action, minor: C.minor, moderate: C.moderate, major: C.major };

function minutesAgo(iso) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

function fmt(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildChartData(gauge) {
  const map = new Map();
  for (const o of gauge.observed) {
    map.set(o.time, { time: o.time, observed: o.stage_ft });
  }
  for (const f of gauge.forecast) {
    const key = f.valid_at;
    const existing = map.get(key) || { time: key };
    map.set(key, { ...existing, median: f.median_ft, low: f.low_ft, high: f.high_ft });
  }
  for (const n of gauge.nws_forecast) {
    const key = n.valid_at;
    const existing = map.get(key) || { time: key };
    map.set(key, { ...existing, nws: n.stage_ft });
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
}

// ── Status Card ───────────────────────────────────────────────────────────────
function StatusCard({ gauge }) {
  const { current, name } = gauge;
  const ago = minutesAgo(current.time);
  const color = CATEGORY_COLOR[current.category] || C.none;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4, fontFamily: FONT_BODY }}>{gauge.chain.toUpperCase()} · {gauge.site_id}</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 600, marginBottom: 2, fontFamily: FONT_HEAD }}>{name}</div>
        <div style={{ color: C.muted, fontSize: 13, fontFamily: FONT_BODY }}>Updated {ago} min ago</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color, fontSize: 36, fontWeight: 700, lineHeight: 1, fontFamily: FONT_HEAD }}>{current.stage_ft.toFixed(2)} ft</div>
        <div style={{ color, fontSize: 13, marginTop: 4, textTransform: "capitalize", fontFamily: FONT_BODY }}>
          {current.category === "none" ? "No flood stage" : `${current.category} flooding`}
        </div>
      </div>
    </div>
  );
}

// ── Risk Box ──────────────────────────────────────────────────────────────────
function RiskBox({ gauge }) {
  const { risk } = gauge;
  const color = CATEGORY_COLOR[risk.category] || C.none;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, fontFamily: FONT_BODY }}>RISK</div>
        <div style={{ color, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY }}>{risk.label}</div>
      </div>
      <div>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, fontFamily: FONT_BODY }}>EXPECTED PEAK</div>
        <div style={{ color: C.text, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY }}>{risk.peak_median_ft.toFixed(2)} ft
          <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}> (up to {risk.peak_high_ft.toFixed(2)})</span>
        </div>
      </div>
      <div>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, fontFamily: FONT_BODY }}>CHANCE OF MINOR FLOOD</div>
        <div style={{ color: C.text, fontSize: 15, fontWeight: 600, fontFamily: FONT_BODY }}>{(risk.prob_minor * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}

// rain
function RainStrip({ gauge }) {
  const { rain_mm } = gauge;
  const bars = [
    { label: "Past 24h", value: rain_mm.past_24h },
    { label: "Next 24h", value: rain_mm.next_24h },
    { label: "Next 48h", value: rain_mm.next_48h },
  ];
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "16px 20px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, fontFamily: FONT_BODY }}>RAINFALL (mm)</div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", height: 60 }}>
        {bars.map(b => (
          <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ color: C.text, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>{b.value.toFixed(1)}</div>
            <div style={{ width: "100%", background: C.rain, borderRadius: 3, height: Math.max(4, (b.value / max) * 40) }} />
            <div style={{ color: C.muted, fontSize: 11, fontFamily: FONT_BODY }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// score
function Scoreboard({ siteId, scoresData }) {
  const gaugeScores = scoresData?.gauges?.[siteId];
  if (!gaugeScores) return null;
  const horizons = ["6", "12", "24", "48"];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "16px 20px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, fontFamily: FONT_BODY }}>MODEL vs PERSISTENCE (MAE in ft)</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FONT_BODY }}>
          <thead>
            <tr>
              {["Lead", "Our MAE", "Persist MAE", "Skill %", "High-water MAE"].map(h => (
                <th key={h} style={{ color: C.muted, fontWeight: 500, textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horizons.map(h => {
              const row = gaugeScores.horizons[h];
              if (!row) return null;
              const better = row.mae_ours < row.mae_persistence;
              return (
                <tr key={h}>
                  <td style={{ color: C.muted, padding: "6px 8px" }}>{h}h</td>
                  <td style={{ color: better ? C.none : C.minor, padding: "6px 8px", fontWeight: 600 }}>{row.mae_ours.toFixed(3)}</td>
                  <td style={{ color: C.text, padding: "6px 8px" }}>{row.mae_persistence.toFixed(3)}</td>
                  <td style={{ color: row.skill_pct > 0 ? C.none : C.minor, padding: "6px 8px" }}>{row.skill_pct.toFixed(1)}%</td>
                  <td style={{ color: C.text, padding: "6px 8px" }}>{row.mae_ours_high.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//chart main one
function MainChart({ gauge }) {
  const data = buildChartData(gauge);
  const thresholds = gauge.thresholds_ft;
  const tColors = { action: C.action, minor: C.minor, moderate: C.moderate, major: C.major };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, fontFamily: FONT_BODY }}>
        <div style={{ color: C.muted, marginBottom: 6 }}>{fmt(label)}</div>
        {payload.map(p => p.value != null && (
          <div key={p.name} style={{ color: p.color || C.text, marginBottom: 2 }}>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) + " ft" : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "16px 20px" }}>
      <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 4, fontFamily: FONT_HEAD }}>River Level Forecast</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, fontFamily: FONT_BODY }}>Past 72h observed + 48h ML forecast vs NWS</div>

      {/* Legend / Key */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
        {[
          { label: "Observed", color: C.observed, style: "solid" },
          { label: "Our ML forecast", color: C.forecast, style: "dashed" },
          { label: "Forecast range", color: C.band, style: "band" },
          { label: "NWS forecast", color: C.nws, style: "dotted" },
          { label: "Action stage", color: C.action, style: "threshold" },
          { label: "Minor flood", color: C.minor, style: "threshold" },
          { label: "Moderate flood", color: C.moderate, style: "threshold" },
          { label: "Major flood", color: C.major, style: "threshold" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {item.style === "band" ? (
              <div style={{ width: 28, height: 10, background: "#3fb95060", borderRadius: 2 }} />
            ) : (
              <div style={{
                width: 28, height: 0,
                borderTop: `2px ${item.style === "dotted" ? "dotted" : item.style === "dashed" ? "dashed" : "solid"} ${item.color}`
              }} />
            )}
            <span style={{ color: C.muted, fontSize: 11, fontFamily: FONT_BODY }}>{item.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis
            dataKey="time"
            tickFormatter={fmtShort}
            tick={{ fill: C.muted, fontSize: 11 }}
            minTickGap={40}
            label={{ value: "Date / Time", position: "insideBottom", offset: -10, fill: C.muted, fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: C.muted, fontSize: 11 }}
            unit=" ft"
            width={58}
            label={{ value: "Stage (ft)", angle: -90, position: "insideLeft", fill: C.muted, fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {Object.entries(thresholds).map(([name, val]) => (
            <ReferenceLine key={name} y={val} stroke={tColors[name]} strokeDasharray="4 3"
              label={{ value: name, fill: tColors[name], fontSize: 10, position: "right" }} />
          ))}

          <Area dataKey="high" fill={C.band} stroke="none" name="High range" legendType="none" />
          <Area dataKey="low" fill={C.bg} stroke="none" name="Low range" legendType="none" />
          <Line dataKey="observed" stroke={C.observed} dot={false} strokeWidth={2} name="Observed" connectNulls />
          <Line dataKey="median" stroke={C.forecast} dot={false} strokeWidth={2} name="Our ML forecast" connectNulls strokeDasharray="5 3" />
          <Line dataKey="nws" stroke={C.nws} dot={{ r: 3 }} strokeWidth={1.5} name="NWS forecast" connectNulls strokeDasharray="2 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

//  River Chain Strip
function ChainStrip({ gauges, selectedId, onSelect }) {
  const grouped = {};
  for (const g of gauges) {
    if (!grouped[g.chain]) grouped[g.chain] = [];
    grouped[g.chain].push(g);
  }
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: "16px 20px" }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, fontFamily: FONT_BODY }}>RIVER CHAIN</div>
      {Object.entries(grouped).map(([chain, gs]) => (
        <div key={chain} style={{ marginBottom: 12 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 6, fontFamily: FONT_BODY }}>{chain}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {gs.map((g, i) => {
              const color = CATEGORY_COLOR[g.current.category] || C.none;
              const isSelected = g.site_id === selectedId;
              return (
                <div key={g.site_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={{ color: C.muted }}>→</span>}
                  <button onClick={() => onSelect(g.site_id)} style={{
                    background: isSelected ? color + "22" : "transparent",
                    border: `1px solid ${color}`,
                    borderRadius: 12, padding: "6px 12px", cursor: "pointer",
                    color, fontSize: 12, fontWeight: isSelected ? 600 : 400, fontFamily: FONT_BODY,
                  }}>
                    {g.name.split(" At ")[1] || g.name.split(" Near ")[1] || g.name}
                    <span style={{ color: C.muted, marginLeft: 4 }}>{g.current.stage_ft.toFixed(1)} ft</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

//  App
export default function GaugeDashboard({ embedded = false }) {
  const [data, setData] = useState(null);
  const [scores, setScores] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/gauges").then(r => r.json()).then(async d => { const details = await Promise.all(d.gauges.map(g => fetch(`/api/gauges/${g.site_id}`).then(r => r.json()))); return { ...d, gauges: details.map(d => d.gauge) }; }),
      fetch("/api/scores").then(r => r.json()),
    ])
      .then(([lat, sc]) => {
        setData(lat);
        setScores(sc);
        setSelectedId(lat.gauges[0]?.site_id);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ background: C.bg, minHeight: embedded ? 240 : "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.minor, fontFamily: FONT_BODY }}>
      Failed to load data: {error}
    </div>
  );

  if (!data) return (
    <div style={{ background: C.bg, minHeight: embedded ? 240 : "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: FONT_BODY }}>
      Loading gauge data…
    </div>
  );

  const gauge = data.gauges.find(g => g.site_id === selectedId) || data.gauges[0];

  return (
    <div style={{ background: C.bg, minHeight: embedded ? 240 : "100vh", color: C.text, fontFamily: "var(--font-sans), system-ui, sans-serif", padding: "24px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            {!embedded && <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.5, fontFamily: FONT_HEAD }}>FloodWatch</h1>}
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2, fontFamily: FONT_BODY }}>Generated {fmt(data.generated_at)} · {data.model_version}</div>
          </div>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 12, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontFamily: FONT_BODY }}>
            {data.gauges.map(g => (
              <option key={g.site_id} value={g.site_id}>{g.name}</option>
            ))}
          </select>
        </div>

        <ChainStrip gauges={data.gauges} selectedId={selectedId} onSelect={setSelectedId} />
        <div style={{ height: 16 }} />
        <StatusCard gauge={gauge} />
        <div style={{ height: 12 }} />
        <ForecastChart gauge={gauge} />
        <div style={{ height: 12 }} />
        <ForecastTable gauge={gauge} />
        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <RiskBox gauge={gauge} />
          <RainStrip gauge={gauge} />
        </div>
        <div style={{ height: 12 }} />
        <Scoreboard siteId={gauge.site_id} scoresData={scores} />
        <div style={{ height: 24 }} />
        <div style={{ color: C.muted, fontSize: 11, textAlign: "center", fontFamily: FONT_BODY }}>
          Data: USGS · NWS · Open-Meteo · Model: hgb-quantile-v1
        </div>
      </div>
    </div>
  );
}