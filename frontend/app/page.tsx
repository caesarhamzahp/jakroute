"use client";
import { useState, useEffect, useRef } from "react";

interface Step {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
  type: string;
  agency: string;
  change_to?: string;
  change_agency?: string;
}

interface RouteResult {
  from: string;
  to: string;
  total_stops: number;
  steps: Step[];
}

interface NearestStop {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
  agency: string;
  distance_m: number;
}

interface GeoResult {
  place_name: string;
  full_address: string;
  lat: number;
  lon: number;
  nearest_stop: NearestStop;
}

const AGENCY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  TJ:  { bg: "#1B2B6B", text: "#ffffff", label: "Transjakarta" },
  MRT: { bg: "#0070C0", text: "#ffffff", label: "MRT Jakarta" },
  LRT: { bg: "#E87722", text: "#ffffff", label: "LRT Jabodebek" },
  KRL: { bg: "#2D7D2F", text: "#ffffff", label: "KRL Commuterline" },
};

const API = "http://localhost:8000";

function LocationInput({
  label,
  icon,
  value,
  onChange,
  onSelectPlace,
  onGPS,
  gpsLoading,
  nearest,
}: {
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  onSelectPlace: (r: GeoResult) => void;
  onGPS: () => void;
  gpsLoading: boolean;
  nearest: NearestStop | null;
}) {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value.length < 3) { setSuggestions([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/geocode?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
        }
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 600);
  }, [value]);

  return (
    <div className="relative">
      <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#1B2B6B" }}>
        {icon} {label}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition-all"
            style={{ borderColor: "#E2E8F0", background: "#F8FAFC", color: "#1B2B6B" }}
            placeholder={`Ketik nama tempat, jalan, atau gedung...`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#1B2B6B")}
            onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; setTimeout(() => setSuggestions([]), 200); }}
          />
          {searching && (
            <div className="absolute right-3 top-3.5 text-xs" style={{ color: "#1B2B6B" }}>⏳</div>
          )}
          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl shadow-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0" }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b last:border-0 text-sm"
                  style={{ borderColor: "#F1F5F9" }}
                  onMouseDown={() => { onSelectPlace(s); setSuggestions([]); }}
                >
                  <div className="font-semibold" style={{ color: "#1B2B6B" }}>{s.place_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{s.full_address.split(",").slice(1, 3).join(",")}</div>
                  <div className="text-xs mt-1 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{ background: AGENCY_BADGE[s.nearest_stop.agency]?.bg || "#1B2B6B" }}>
                      {AGENCY_BADGE[s.nearest_stop.agency]?.label}
                    </span>
                    <span style={{ color: "#94A3B8" }}>{s.nearest_stop.stop_name} · {s.nearest_stop.distance_m}m</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onGPS}
          disabled={gpsLoading}
          className="rounded-xl px-4 font-bold text-white text-lg transition-opacity hover:opacity-80"
          style={{ background: "#1B2B6B", minWidth: 48 }}
          title="Gunakan lokasi saat ini"
        >
          {gpsLoading ? "⏳" : "📍"}
        </button>
      </div>
      {nearest && (
        <div className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: "#64748B" }}>
          <span className="px-1.5 py-0.5 rounded text-white" style={{ background: AGENCY_BADGE[nearest.agency]?.bg || "#1B2B6B", fontSize: 10 }}>
            {AGENCY_BADGE[nearest.agency]?.label}
          </span>
          {nearest.stop_name} · {nearest.distance_m}m dari lokasi
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromStop, setFromStop] = useState<NearestStop | null>(null);
  const [toStop, setToStop] = useState<NearestStop | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState("");

  const getGPS = async (type: "from" | "to") => {
    if (!navigator.geolocation) { setError("Browser tidak support GPS"); return; }
    setGpsLoading(type);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(`${API}/api/nearest?lat=${lat}&lon=${lon}`);
          const data: NearestStop = await res.json();
          if (type === "from") { setFromStop(data); setFrom(data.stop_name); }
          else { setToStop(data); setTo(data.stop_name); }
        } catch { setError("Gagal cari halte terdekat"); }
        finally { setGpsLoading(null); }
      },
      () => { setError("Gagal dapat lokasi GPS"); setGpsLoading(null); }
    );
  };

  const searchRoute = async () => {
    const fromQuery = fromStop?.stop_name || from;
    const toQuery = toStop?.stop_name || to;
    if (!fromQuery || !toQuery) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/api/route?from_stop=${encodeURIComponent(fromQuery)}&to_stop=${encodeURIComponent(toQuery)}`);
      if (!res.ok) { const e = await res.json(); setError(e.detail); return; }
      setResult(await res.json());
    } catch { setError("Gagal konek ke server!"); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen" style={{ background: "#F1F5F9" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-6" style={{ background: "#1B2B6B" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-black text-lg" style={{ color: "#1B2B6B" }}>J</div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">JakRoute</h1>
          </div>
          <p className="text-sm" style={{ color: "#93C5FD" }}>Cari rute transum Jakarta & Jabodetabek</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2">
        {/* Search Card */}
        <div className="rounded-2xl p-5 mb-4 shadow-lg" style={{ background: "#fff" }}>
          <div className="space-y-4">
            <LocationInput
              label="Lokasi Asal"
              icon="🔵"
              value={from}
              onChange={(v) => { setFrom(v); setFromStop(null); }}
              onSelectPlace={(r) => { setFrom(r.place_name); setFromStop(r.nearest_stop); }}
              onGPS={() => getGPS("from")}
              gpsLoading={gpsLoading === "from"}
              nearest={fromStop}
            />

            {/* Swap button */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
              <button
                onClick={() => {
                  setFrom(to); setTo(from);
                  setFromStop(toStop); setToStop(fromStop);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-opacity hover:opacity-80"
                style={{ background: "#1B2B6B" }}
              >
                ⇅
              </button>
              <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
            </div>

            <LocationInput
              label="Lokasi Tujuan"
              icon="🔴"
              value={to}
              onChange={(v) => { setTo(v); setToStop(null); }}
              onSelectPlace={(r) => { setTo(r.place_name); setToStop(r.nearest_stop); }}
              onGPS={() => getGPS("to")}
              gpsLoading={gpsLoading === "to"}
              nearest={toStop}
            />

            <button
              onClick={searchRoute}
              disabled={loading || (!from && !fromStop) || (!to && !toStop)}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#1B2B6B" }}
            >
              {loading ? "Mencari rute terbaik..." : "Cari Rute →"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4 text-sm font-medium" style={{ background: "#FEE2E2", color: "#991B1B" }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8" style={{ background: "#fff" }}>
            {/* Route header */}
            <div className="px-5 py-4" style={{ background: "#1B2B6B" }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#93C5FD" }}>RUTE TERBAIK</div>
                  <div className="font-bold text-white text-sm">{result.from}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#93C5FD" }}>↓ menuju</div>
                  <div className="font-bold text-white text-sm">{result.to}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-white">{result.total_stops}</div>
                  <div className="text-xs" style={{ color: "#93C5FD" }}>halte</div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="px-5 py-4 space-y-0">
              {result.steps.map((step, i) => (
                <div key={i}>
                  {step.change_to && (
                    <div className="flex items-center gap-2 py-2 pl-6">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                        style={{ background: AGENCY_BADGE[step.change_agency || "TJ"]?.bg || "#1B2B6B" }}
                      >
                        {AGENCY_BADGE[step.change_agency || "TJ"]?.label} · {step.change_to}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 py-1.5">
                    <div className="flex flex-col items-center" style={{ width: 20 }}>
                      <div
                        className="w-3 h-3 rounded-full border-2 border-white shadow"
                        style={{
                          background: step.type === "start" ? "#1B2B6B" : step.type === "end" ? "#DC2626" : "#CBD5E1",
                          boxShadow: step.type === "start" || step.type === "end" ? "0 0 0 3px #BFDBFE" : "none"
                        }}
                      />
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: step.type === "start" ? "#1B2B6B" : step.type === "end" ? "#DC2626" : "#64748B",
                        fontWeight: step.type === "start" || step.type === "end" ? 700 : 400
                      }}
                    >
                      {step.stop_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
