"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";

const data = [
  { time: "6h ago", actual: 14.2, forecast: null },
  { time: "4h ago", actual: 14.8, forecast: null },
  { time: "2h ago", actual: 15.4, forecast: null },
  { time: "Now",    actual: 15.9, forecast: 15.9 },
  { time: "+6h",    actual: null, forecast: 16.8 },
  { time: "+12h",   actual: null, forecast: 18.1 },
  { time: "+24h",   actual: null, forecast: 20.2 },
  { time: "+48h",   actual: null, forecast: 18.5 },
];

export default function ForecastChart() {
  return (
    <div className="bg-[#141e2e] border border-blue-900/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">River Level Forecast</h3>
          <p className="text-slate-500 text-xs mt-0.5">Suwannee River at Live Oak, FL — 48-hour ML prediction</p>
        </div>
        <span className="text-xs bg-blue-600/20 text-blue-300 border border-blue-600/30 px-2 py-0.5 rounded-full font-mono">
          USGS 02315500
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f30" />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e3a5f" }} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#1e3a5f" }} tickLine={false} domain={[12, 26]} unit=" ft" />
          <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #1e3a5f", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
          <ReferenceLine y={22} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Flood Stage", fill: "#ef4444", fontSize: 10 }} />
          <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Action Stage", fill: "#f59e0b", fontSize: 10 }} />
          <Line type="monotone" dataKey="actual" name="Observed" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="forecast" name="ML Forecast" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={{ fill: "#f97316", r: 3 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}