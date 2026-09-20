"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

type GaugeSummary = {
  site_id: string; name: string; latitude: number; longitude: number;
  current: { stage_ft: number; category: string };
  risk: { category: string };
};

const CATEGORY_COLOR: Record<string, string> = {
  none: "#4caf82", action: "#ffa600", minor: "#ff9800", moderate: "#e05555", major: "#b91c1c",
};

export default function GaugeMap({ gauges, selectedId, onSelect }: {
  gauges: GaugeSummary[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const center: LatLngExpression = [37.2, -80.0]; // central Virginia

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom={false} className="h-full w-full rounded-[32px]">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {gauges.map((g) => (
        <CircleMarker
          key={g.site_id}
          center={[g.latitude, g.longitude]}
          radius={g.site_id === selectedId ? 12 : 8}
          pathOptions={{ color: "#17496c", weight: 2, fillColor: CATEGORY_COLOR[g.risk.category] ?? "#4caf82", fillOpacity: 0.9 }}
          eventHandlers={{ click: () => onSelect(g.site_id) }}
        >
          <Popup>
            <strong>{g.name}</strong><br />
            {g.current.stage_ft.toFixed(2)} ft — {g.risk.category}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}