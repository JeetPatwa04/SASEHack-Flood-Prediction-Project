"use client";

import { Droplets, Bell, Map, BarChart3 } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Dashboard", href: "#dashboard", icon: BarChart3 },
  { label: "Map", href: "#map", icon: Map },
  { label: "Alerts", href: "#alerts", icon: Bell },
];

export default function Header() {
  const [active, setActive] = useState("Dashboard");

  return (
    <header className="sticky top-0 z-50 bg-[#0f1623]/90 backdrop-blur border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-bold">
            <span className="text-white">Flood</span>
            <span className="text-orange-500">Watch</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              onClick={() => setActive(label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active === label
                  ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live · USGS Data
        </div>
      </div>
    </header>
  );
}