"use client";

import { TrendingUp, TrendingDown, Minus, MapPin, Clock } from "lucide-react";

export type FloodStage = "Normal" | "Action" | "Flood" | "Major";

interface GaugeCardProps {
  name: string;
  location: string;
  currentFt: number;
  floodStageFt: number;
  stage: FloodStage;
  trend: "rising" | "falling" | "steady";
  mlForecast: number;
  lastUpdated: string;
  precipitation: number;
}

const stageConfig = {
  Normal: { text: "text-blue-400",   border: "border-blue-500/30",   badge: "bg-blue-500/20 text-blue-300",   bar: "bg-blue-500" },
  Action: { text: "text-yellow-400", border: "border-yellow-500/40", badge: "bg-yellow-500/20 text-yellow-300", bar: "bg-yellow-500" },
  Flood:  { text: "text-orange-400", border: "border-orange-500/40", badge: "bg-orange-500/20 text-orange-300", bar: "bg-orange-500" },
  Major:  { text: "text-red-400",    border: "border-red-600/40",    badge: "bg-red-600/20 text-red-300",      bar: "bg-red-600" },
};

export default function GaugeCard({ name, location, currentFt, floodStageFt, stage, trend, mlForecast, lastUpdated, precipitation }: GaugeCardProps) {
  const cfg = stageConfig[stage];
  const pct = Math.min((currentFt / (floodStageFt * 1.3)) * 100, 100);

  return (
    <div className={`bg-[#141e2e] border ${cfg.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{name}</h3>
          <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
            <MapPin className="w-3 h-3" />{location}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{stage}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>River Level</span>
          <span className={`font-mono font-bold ${cfg.text}`}>{currentFt} ft</span>
        </div>
        <div className="h-2 bg-[#0f1623] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-0.5">
          <span>0 ft</span>
          <span>Flood: {floodStageFt} ft</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0f1623] rounded-lg p-2">
          {trend === "rising" && <TrendingUp className="w-4 h-4 text-red-400 mx-auto" />}
          {trend === "falling" && <TrendingDown className="w-4 h-4 text-green-400 mx-auto" />}
          {trend === "steady" && <Minus className="w-4 h-4 text-slate-400 mx-auto" />}
          <p className="text-xs text-slate-400 mt-0.5">Trend</p>
          <p className="text-xs text-white capitalize">{trend}</p>
        </div>
        <div className="bg-[#0f1623] rounded-lg p-2">
          <p className="text-xs text-blue-400 font-bold">{mlForecast} ft</p>
          <p className="text-xs text-slate-400">ML Forecast</p>
          <p className="text-xs text-slate-500">24 hr</p>
        </div>
        <div className="bg-[#0f1623] rounded-lg p-2">
          <p className="text-xs text-cyan-400 font-bold">{precipitation}"</p>
          <p className="text-xs text-slate-400">Precip</p>
          <p className="text-xs text-slate-500">24 hr</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 text-xs text-slate-600">
        <Clock className="w-3 h-3" />Updated {lastUpdated}
      </div>
    </div>
  );
}