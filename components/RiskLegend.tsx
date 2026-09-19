const RADAR = [
  { dbz: "20 dBZ", color: "#00ffff", label: "Trace precipitation" },
  { dbz: "30 dBZ", color: "#00cc00", label: "~0.1 inch/hour" },
  { dbz: "36 dBZ", color: "#00ff00", label: "~0.25 inch/hour" },
  { dbz: "41 dBZ", color: "#ffff00", label: "~0.5 inch/hour" },
  { dbz: "47 dBZ", color: "#ffa500", label: "~1.25 inch/hour" },
  { dbz: "52 dBZ", color: "#ff0000", label: "~2.5 inch/hour" },
  { dbz: "55 dBZ", color: "#cc0000", label: "~4 inch/hour" },
  { dbz: "60 dBZ", color: "#990000", label: "~8 inch/hour" },
  { dbz: "65 dBZ", color: "#ff00ff", label: "~16+ inch/hour" },
];

const STAGES = [
  { stage: "Normal", color: "bg-blue-500",   desc: "Below action stage" },
  { stage: "Action", color: "bg-yellow-500", desc: "Minor flooding possible" },
  { stage: "Flood",  color: "bg-orange-500", desc: "Property/road flooding" },
  { stage: "Major",  color: "bg-red-600",    desc: "Significant inundation" },
];

export default function RiskLegend() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#141e2e] border border-blue-900/40 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">Radar Intensity</h3>
        <div className="space-y-1.5">
          {RADAR.map(({ dbz, color, label }) => (
            <div key={dbz} className="flex items-center gap-3 text-sm">
              <span className="w-8 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-400 font-mono w-16 text-xs">{dbz}</span>
              <span className="text-slate-300 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#141e2e] border border-blue-900/40 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">Flood Stages</h3>
        <div className="space-y-3">
          {STAGES.map(({ stage, color, desc }) => (
            <div key={stage} className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              <div>
                <p className="text-white text-sm font-medium">{stage}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}