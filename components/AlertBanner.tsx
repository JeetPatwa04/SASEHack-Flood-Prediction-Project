"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

const ALERTS = [
  { id: "1", severity: "warning", title: "Flood Warning", area: "Suwannee County, FL", expires: "Sat Sep 21 6:00 AM" },
  { id: "2", severity: "watch", title: "Flood Watch", area: "Hamilton County, FL", expires: "Sat Sep 21 12:00 PM" },
];

const styles: Record<string, string> = {
  watch:   "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
  warning: "bg-orange-500/15 border-orange-500/40 text-orange-300",
};

export default function AlertBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = ALERTS.filter((a) => !dismissed.includes(a.id));

  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => (
        <div key={alert.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${styles[alert.severity]}`}>
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>{alert.title}</strong> · {alert.area} · <span className="opacity-60 text-xs">Expires {alert.expires}</span></span>
          </div>
          <button onClick={() => setDismissed((d) => [...d, alert.id])}>
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
}