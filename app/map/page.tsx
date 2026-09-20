"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

const GaugeMap = dynamic(() => import("@/components/GaugeMap"), { ssr: false });

type GaugeSummary = {
  site_id: string; name: string; latitude: number; longitude: number;
  current: { stage_ft: number; category: string };
  risk: { category: string; label: string };
};
type GaugeDetail = {
  gauge: {
    name: string;
    thresholds_ft: { minor: number };
    current: { stage_ft: number };
    observed: { time: string; stage_ft: number }[];
    forecast: { valid_at: string; median_ft: number }[];
    risk: { label: string };
  };
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
    const interval = setInterval(load, 5 * 60 * 1000); // re-fetches every 5 minutes
    return () => clearInterval(interval);
  }, [selectedId]);
  const chartData = useMemo(() => {
    if (!detail) return [];
    const observed = detail.gauge.observed.slice(-24).map((p) => ({
      time: new Date(p.time).toLocaleTimeString([], { hour: "2-digit" }), observed: p.stage_ft,
    }));
    const forecast = detail.gauge.forecast.map((p) => ({
      time: new Date(p.valid_at).toLocaleTimeString([], { hour: "2-digit" }), forecast: p.median_ft,
    }));
    return [...observed, ...forecast];
  }, [detail]);

  return (
    <div className="min-h-screen bg-[#17496c]">
      <NavBar />
      <div className="px-6 py-10">
        <h1 className="mb-8 text-center font-potta text-5xl text-white md:text-7xl">INTERACTIVE MAP</h1>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 rounded-[40px] bg-[#ffa600] p-6 lg:grid-cols-[280px_1fr_1fr] lg:h-[600px]">
          <div className="overflow-y-auto rounded-[32px] bg-white p-4">
            <div className="mb-3 font-potta text-sm text-[#17496c]">RIVER GAUGES</div>
            <div className="flex flex-col gap-2">
              {gauges.map((g) => (
                <button
                  key={g.site_id}
                  onClick={() => setSelectedId(g.site_id)}
                  className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors ${
                    g.site_id === selectedId ? "border-[#ffa600] bg-[#ffa600]/10" : "border-transparent bg-black/5 hover:border-[#ffa600]/50"
                  }`}
                >
                  <div className="font-medium text-[#17496c]">{g.name}</div>
                  <div className="font-mono-flood text-xs text-[#17496c]/60">
                    {g.current.stage_ft.toFixed(2)} ft — {g.risk.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[320px] overflow-hidden rounded-[32px]">
            <GaugeMap gauges={gauges} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[32px] bg-white p-5">
              <div className="font-potta text-2xl text-[#17496c]">{detail?.gauge.name ?? "Select a gauge"}</div>
              {detail && (
                <div className="mt-3 space-y-1 font-mono-flood text-sm text-[#17496c]/80">
                  <div>Stage now: {detail.gauge.current.stage_ft.toFixed(2)} ft</div>
                  <div>Minor flood at: {detail.gauge.thresholds_ft.minor.toFixed(1)} ft</div>
                  <div>Status: {detail.gauge.risk.label}</div>
                </div>
              )}
            </div>
            <div className="flex-1 rounded-[32px] bg-white p-4">
              <span className="mb-2 inline-block rounded-full bg-[#ffa600] px-4 py-1 font-potta text-xs text-white">River Level Forecast</span>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: "Time", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: "Stage (ft)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip />
                  {detail && (
                    <ReferenceLine y={detail.gauge.thresholds_ft.minor} stroke="#ff9800" strokeDasharray="4 4" label={{ value: "Minor", fontSize: 10 }} />
                  )}
                  <Line type="monotone" dataKey="observed" stroke="#17496c" dot={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#2dd4bf" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}