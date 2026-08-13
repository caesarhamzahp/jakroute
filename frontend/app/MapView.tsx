"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Step {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
  type: string;
  agency: string;
}

const AGENCY_COLOR: Record<string, string> = {
  TJ: "#1B2B6B",
  MRT: "#0070C0",
  LRT: "#E87722",
  KRL: "#2D7D2F",
};

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export default function MapView({ steps }: { steps: Step[] }) {
  const positions: [number, number][] = steps.map((s) => [s.lat, s.lon]);
  const center: [number, number] = positions[0] || [-6.2, 106.8];

  const startIcon = L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:#1B2B6B;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px #BFDBFE"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
  const endIcon = L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:#DC2626;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px #FECACA"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
  const stopIcon = L.divIcon({
    className: "",
    html: `<div style="width:8px;height:8px;background:#94A3B8;border:2px solid white;border-radius:50%"></div>`,
    iconSize: [8, 8], iconAnchor: [4, 4],
  });

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds positions={positions} />
      <Polyline positions={positions} color="#1B2B6B" weight={4} opacity={0.8} />
      {steps.map((step, i) => (
        <Marker key={i} position={[step.lat, step.lon]}
          icon={step.type === "start" ? startIcon : step.type === "end" ? endIcon : stopIcon}>
          <Popup>
            <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: AGENCY_COLOR[step.agency] || "#1B2B6B" }}>{step.stop_name}</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>{step.agency}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
