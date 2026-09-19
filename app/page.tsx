import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AlertBanner from "@/components/AlertBanner";
import GaugeCard from "@/components/GaugeCard";
import ForecastChart from "@/components/ForecastChart";
import MapPlaceholder from "@/components/MapPlaceholder";
import RiskLegend from "@/components/RiskLegend";
import Footer from "@/components/Footer";

const GAUGES = [
  {
    name: "Suwannee River at Live Oak",
    location: "Suwannee Co., FL",
    currentFt: 19.8,
    floodStageFt: 22,
    stage: "Flood" as const,
    trend: "rising" as const,
    mlForecast: 20.2,
    lastUpdated: "5 min ago",
    precipitation: 2.3,
  },
  {
    name: "Withlacoochee at Clyattville",
    location: "Lowndes Co., GA",
    currentFt: 24.1,
    floodStageFt: 22,
    stage: "Major" as const,
    trend: "rising" as const,
    mlForecast: 25.8,
    lastUpdated: "8 min ago",
    precipitation: 3.1,
  },
  {
    name: "St. Johns River at Astor",
    location: "Lake Co., FL",
    currentFt: 16.2,
    floodStageFt: 18,
    stage: "Action" as const,
    trend: "steady" as const,
    mlForecast: 16.5,
    lastUpdated: "3 min ago",
    precipitation: 0.8,
  },
  {
    name: "Apalachicola at Chattahoochee",
    location: "Gadsden Co., FL",
    currentFt: 11.4,
    floodStageFt: 25,
    stage: "Normal" as const,
    trend: "falling" as const,
    mlForecast: 10.9,
    lastUpdated: "10 min ago",
    precipitation: 0.2,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <HeroSection />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <AlertBanner />
        <div className="grid lg:grid-cols-3 gap-5 mb-8">
          <div className="lg:col-span-2"><MapPlaceholder /></div>
          <div><RiskLegend /></div>
        </div>
        <div className="mb-8"><ForecastChart /></div>
        <h2 className="text-white font-bold text-lg mb-4">Monitored River Gauges</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {GAUGES.map((g) => <GaugeCard key={g.name} {...g} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}