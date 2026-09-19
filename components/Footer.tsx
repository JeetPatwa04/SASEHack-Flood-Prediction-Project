import { Droplets } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-blue-900/30 mt-16 py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-slate-300">
            Flood<span className="text-orange-500">Watch</span>
          </span>
          <span>— ML-Powered River Level Forecasting</span>
        </div>
        <span>Data: USGS National Water Dashboard</span>
      </div>
    </footer>
  );
}