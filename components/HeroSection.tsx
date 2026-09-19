import { AlertTriangle, TrendingUp, Droplets, Shield } from "lucide-react";

const stats = [
  { label: "Gauges Monitored", value: "8,200+", icon: Droplets, color: "text-blue-400" },
  { label: "Forecast Accuracy", value: "94.2%", icon: TrendingUp, color: "text-green-400" },
  { label: "Active Alerts", value: "12", icon: AlertTriangle, color: "text-orange-400" },
  { label: "Areas Safe", value: "1,840", icon: Shield, color: "text-teal-400" },
];

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-[#0f1623] via-[#0d1f3c] to-[#0f1623] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            ML-Powered Flood Intelligence
          </div>
          <h1 className="text-5xl font-extrabold mb-4">
            <span className="text-white">Flood</span>
            <span className="text-orange-500">Watch</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Real-time river level monitoring with machine learning forecasts.
            Stay ahead of floods before they happen.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#141e2e] border border-blue-900/40 rounded-xl p-5">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}