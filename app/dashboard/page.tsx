"use client";
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

type GaugeSummary = {
  site_id: string; name: string;
  current: { stage_ft: number; category: string };
  risk: { category: string; label: string };
};
type GaugesResponse = { is_sample_data: boolean; gauges: GaugeSummary[] };
type Scores = { gauges: Record<string, { horizons: Record<string, { skill_pct: number | null }> }> };

const CATEGORY_RANK: Record<string, number> = { none: 0, action: 1, minor: 2, moderate: 3, major: 4 };

export default function Dashboard() {
  const [data, setData] = useState<GaugesResponse | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);

  useEffect(() => {
    fetch("/api/gauges").then((r) => r.json()).then(setData);
    fetch("/api/scores").then((r) => r.json()).then(setScores);
  }, []);

  const loading = !data || !scores;
  const highestRisk = data?.gauges.reduce((worst, g) =>
    CATEGORY_RANK[g.risk.category] > CATEGORY_RANK[worst.risk.category] ? g : worst, data.gauges[0]);
  const avgSkill24h = scores
    ? Math.round(Object.values(scores.gauges).reduce((s, g) => s + (g.horizons["24"]?.skill_pct ?? 0), 0) / Object.values(scores.gauges).length)
    : null;

  const stats = [
    { label: "GAUGES MONITORED", value: data ? String(data.gauges.length) : "—" },
    { label: "HIGHEST RISK NOW", value: highestRisk?.risk.category.toUpperCase() ?? "—", sub: highestRisk?.name },
    { label: "MODEL SKILL VS PERSISTENCE (24H)", value: avgSkill24h !== null ? `+${avgSkill24h}%` : "—" },
    { label: "DATA SOURCE", value: data ? (data.is_sample_data ? "SAMPLE" : "LIVE") : "—" },
  ];

  return (
    <div className="min-h-screen bg-[#17496c]">
      <NavBar />
      <div className="px-6 py-12">
        <h1 className="mb-10 text-center font-potta text-5xl text-white md:text-7xl">DASHBOARD</h1>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 rounded-[40px] bg-[#ffa600] p-8 sm:grid-cols-2">
          {stats.map((s) => (
            <div key={s.label} className="animate-fade-up rounded-[40px] bg-white p-6">
              <div className="font-mono-flood text-xs text-[#17496c]/60">{s.label}</div>
              <div className="mt-2 font-potta text-4xl text-[#17496c]">{loading ? "…" : s.value}</div>
              {s.sub && <div className="mt-1 text-sm text-[#17496c]/70">{s.sub}</div>}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[40px]">
        </div>
      </div>
    </div>
  );
}