"use client";

import { ZoomIn, ZoomOut, LocateFixed } from "lucide-react";

const PINS = [
  { id: "1", x: 42, y: 38, name: "Suwannee at Live Oak", stage: "Flood", color: "#f97316" },
  { id: "2", x: 61, y: 55, name: "St. Johns at Astor", stage: "Action", color: "#eab308" },
  { id: "3", x: 28, y: 62, name: "Apalachicola at Chattahoochee", stage: "Normal", color: "#3b82f6" },
  { id: "4", x: 75, y: 44, name: "St. Johns at Jacksonville", stage: "Normal", color: "#3b82f6" },
  { id: "5", x: 55, y: 25, name: "Withlacoochee at Clyattville", stage: "Major", color: "#ef4444" },
];

export default function MapPlaceholder() {
  return (
    <div className="bg-[#141e2e] border border-blue-900/40 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-blue-900/30">
        <h3 className="text-white font-semibold text-sm">River Gauge Map</h3>
        <span className="text-xs text-slate-400">Florida · 5 gauges</span>
      </div>
      <div className="relative bg-[#0d1829] h-72 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {PINS.map((pin) => (
          <div key={pin.id} className="absolute group cursor-pointer" style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}>
            <span className="absolute inset-0 rounded-full opacity-40 animate-ping" style={{ backgroundColor: pin.color }} />
            <span className="relative block w-4 h-4 rounded-full border-2 border-white/30" style={{ backgroundColor: pin.color }} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-[#1a2332] border border-blue-800/60 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
                <p className="text-white font-medium">{pin.name}</p>
                <p style={{ color: pin.color }} className="font-semibold">{pin.stage} Stage</p>
              </div>
            </div>
          </div>
        ))}

        <div className="absolute right-3 top-3 flex flex-col gap-1">
          {[ZoomIn, ZoomOut, LocateFixed].map((Icon, i) => (
            <button key={i} className="w-7 h-7 bg-[#141e2e]/90 border border-blue-900/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white">
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="absolute left-3 bottom-3 bg-[#141e2e]/90 border border-blue-900/50 rounded-lg px-3 py-2">
          {[["Normal","#3b82f6"],["Action","#eab308"],["Flood","#f97316"],["Major","#ef4444"]].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-300 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
