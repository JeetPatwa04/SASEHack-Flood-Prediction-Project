"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

const GaugeMap = dynamic(() => import("@/components/GaugeMap"), { ssr: false });

type GaugeSummary = {
  site_id: string; name: string; latitude: number; longitude: number;
  current: { stage_ft: number; category: string };
  risk: { category: string; label: string };
};
type GaugeDetail = {
  gauge: {
    name: string;
    thresholds_ft: { action: number; minor: number; moderate: number; major: number };
    current: { time: string; stage_ft: number; category: string };
    observed: { time: string; stage_ft: number }[];
    forecast: { valid_at: string; median_ft: number; low_ft: number; high_ft: number }[];
    nws_forecast: { valid_at: string; stage_ft: number }[];
    risk: { label: string; peak_median_ft: number; prob_minor: number };
    rain_mm: { past_24h: number; next_24h: number; next_48h: number };
  };
  scores: { horizons: Record<string, { mae_ours: number; mae_persistence: number; skill_pct: number }> };
};

function minutesAgo(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

const CATEGORY_COLOR: Record<string, string> = {
  none: "#22c55e", action: "#f59e0b", minor: "#f97316", moderate: "#ef4444", major: "#dc2626",
};

export default function InteractiveMap() {
  const [gauges, setGauges] = useState<GaugeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GaugeDetail | null>(null);

  useEffect(() => {
    fetch("/api/gauges").then((r) => r.json()).then((d) => {
      setGauges(d.gauges);
      if (d.gauges.length) setSelectedId(d.gauges[0].site_id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const load = () => fetch(`/api/gauges/${selectedId}`).then((r) => r.json()).then(setDetail);
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const chartData = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, any>();
    detail.gauge.observed.forEach((o) => map.set(o.time, { time: o.time, observed: o.stage_ft }));
    detail.gauge.forecast.forEach((f) => {
      const e = map.get(f.valid_at) || { time: f.valid_at };
      map.set(f.valid_at, { ...e, forecast: f.median_ft, low: f.low_ft, high: f.high_ft });
    });
    detail.gauge.nws_forecast.forEach((n) => {
      const e = map.get(n.valid_at) || { time: n.valid_at };
      map.set(n.valid_at, { ...e, nws: n.stage_ft });
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [detail]);

  const g = detail?.gauge;
  const statusColor = g ? CATEGORY_COLOR[g.current.category] || "#22c55e" : "#22c55e";

  return (
    <div className="min-h-screen bg-navy">
      <NavBar />
      <div className="px-6 py-10">
        <h1 className="mb-8 text-center font-potta text-5xl text-white md:text-7xl">INTERACTIVE MAP</h1>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 rounded-blob bg-amber p-6 lg:grid-cols-[280px_1fr_1fr] lg:h-[600px]">
          <div className="overflow-y-auto rounded-blob-sm bg-white p-4">
            <div className="mb-3 font-potta text-sm text-navy">RIVER GAUGES</div>
            <div className="flex flex-col gap-2">
              {gauges.map((gauge) => (
                <button key={gauge.site_id} onClick={() => setSelectedId(gauge.site_id)}
                  className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors ${gauge.site_id === selectedId ? "border-amber bg-amber/10" : "border-transparent bg-black/5 hover:border-amber/50"}`}>
                  <div className="font-medium text-navy">{gauge.name}</div>
                  <div className="font-mono-flood text-xs text-navy/60">{gauge.current.stage_ft.toFixed(2)} ft — {gauge.risk.category}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[320px] overflow-hidden rounded-blob-sm">
            <GaugeMap gauges={gauges} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto">
            <div className="rounded-blob-xs bg-white p-4">
              <div className="font-potta text-lg text-navy">{g?.name ?? "Select a gauge"}</div>
              {g && (
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="font-mono-flood text-xs text-navy/60">Updated {minutesAgo(g.current.time)} min ago</div>
                    <div className="font-mono-flood text-sm text-navy/80 mt-1">Minor flood at {g.thresholds_ft.minor} ft</div>
                  </div>
                  <div className="text-right">
                    <div className="font-potta text-3xl" style={{ color: statusColor }}>{g.current.stage_ft.toFixed(2)} ft</div>
                    <div className="font-mono-flood text-xs capitalize" style={{ color: statusColor }}>
                      {g.current.category === "none" ? "No flood stage" : `${g.current.category} flooding`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-blob-xs bg-white p-4 flex-1">
              <span className="mb-2 inline-block rounded-full bg-amber px-3 py-1 font-potta text-xs text-white">River Level Forecast</span>
              <div className="flex gap-3 flex-wrap mb-2">
                {[{ label: "Observed", color: "#17496c" }, { label: "Our forecast", color: "#2dd4bf" }, { label: "NWS forecast", color: "#f59e0b" }].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="w-5 h-0.5" style={{ background: item.color }} />
                    <span className="font-mono-flood text-xs text-navy/60">{item.label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>

                <ComposedChart data={chartData}>
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })} minTickGap={30} />
                  <YAxis tick={{ fontSize: 9 }} unit=" ft" width={45} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} ft`} contentStyle={{ background: "white", border: "1px solid #17496c", borderRadius: "8px" }} labelStyle={{ display: "none" }} itemStyle={{ color: "#17496c" }} />
                  {g && Object.entries(g.thresholds_ft).map(([name, val]) => (
                    <ReferenceLine key={name} y={val as number} stroke={name === "minor" ? "#f97316" : name === "moderate" ? "#ef4444" : name === "major" ? "#dc2626" : "#f59e0b"} strokeDasharray="3 3" />
                  ))}
                  <Area dataKey="high" fill="#2dd4bf20" stroke="none" hide />
                  <Area dataKey="low" fill="white" stroke="none" />
                  <Line dataKey="observed" stroke="#17496c" dot={false} strokeWidth={2} connectNulls />
                  <Line dataKey="forecast" stroke="#2dd4bf" dot={false} strokeWidth={2} strokeDasharray="4 2" connectNulls />
                  <Line dataKey="nws" stroke="#f59e0b" dot={{ r: 2 }} strokeWidth={1.5} connectNulls strokeDasharray="2 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {g && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-blob-xs bg-white p-4">
                  <div className="font-potta text-xs text-navy/60 mb-1">FLOOD RISK</div>
                  <div className="font-potta text-sm text-navy">{g.risk.label}</div>
                  <div className="font-mono-flood text-xs text-navy/70 mt-1">Peak: {g.risk.peak_median_ft.toFixed(2)} ft</div>
                  <div className="font-mono-flood text-xs text-navy/70">Flood chance (48h): {(g.risk.prob_minor * 100).toFixed(0)}%</div>
                </div>
                <div className="rounded-blob-xs bg-white p-4">
                  <div className="font-potta text-xs text-navy/60 mb-1">RAINFALL (mm)</div>
                  <div className="font-mono-flood text-xs text-navy/80 space-y-1">
                    <div>Past 24h: <span className="font-bold text-navy">{g.rain_mm.past_24h}</span></div>
                    <div>Next 24h: <span className="font-bold text-navy">{g.rain_mm.next_24h}</span></div>
                    <div>Next 48h: <span className="font-bold text-navy">{g.rain_mm.next_48h}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}