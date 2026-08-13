"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

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

interface SuggestResult {
  type: string;
  place_name: string;
  full_address: string;
  lat: number;
  lon: number;
  nearest_stop: NearestStop;
}

const AGENCY_BADGE: Record<string, { bg: string; label: string; fare: number; unit: string }> = {
  TJ:  { bg: "#1B2B6B", label: "Transjakarta", fare: 3500, unit: "flat" },
  MRT: { bg: "#0070C0", label: "MRT Jakarta",  fare: 4000, unit: "per_stasiun" },
  LRT: { bg: "#E87722", label: "LRT Jabodebek",fare: 5000, unit: "per_stasiun" },
  KRL: { bg: "#2D7D2F", label: "KRL Commuterline", fare: 3000, unit: "per_stasiun" },
};

const API = "http://localhost:8000";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function estimateFare(steps: Step[]) {
  const agencies = new Set<string>();
  let total = 0;
  const breakdown: { agency: string; label: string; fare: number }[] = [];

  steps.forEach((s) => {
    if (s.change_agency && !agencies.has(s.change_agency)) {
      agencies.add(s.change_agency);
      const info = AGENCY_BADGE[s.change_agency];
      if (info) {
        breakdown.push({ agency: s.change_agency, label: info.label, fare: info.fare });
        total += info.fare;
      }
    }
  });

  if (breakdown.length === 0 && steps.length > 0) {
    const agency = steps[0].agency;
    const info = AGENCY_BADGE[agency];
    if (info) {
      breakdown.push({ agency, label: info.label, fare: info.fare });
      total = info.fare;
    }
  }

  return { total, breakdown };
}

function LocationInput({ label, icon, value, onChange, onSelect, onGPS, gpsLoading, nearest }: {
  label: string; icon: string; value: string;
  onChange: (v: string) => void;
  onSelect: (r: SuggestResult) => void;
  onGPS: () => void;
  gpsLoading: boolean;
  nearest: NearestStop | null;
}) {
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (value.length < 2) { setSuggestions([]); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/suggest?q=${encodeURIComponent(value)}`);
        if (res.ok) { const d = await res.json(); setSuggestions(d.results || []); setOpen(true); }
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 400);
  }, [value]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#1B2B6B" }}>
        {icon} {label}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition-all"
            style={{ borderColor: nearest ? "#1B2B6B" : "#E2E8F0", background: "#F8FAFC", color: "#1B2B6B" }}
            placeholder="Ketik nama tempat, jalan, halte..."
            value={value}
            onChange={(e) => { onChange(e.target.value); }}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          />
          {searching && <div className="absolute right-3 top-3.5 text-xs animate-pulse" style={{ color: "#1B2B6B" }}>🔍</div>}
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0" }}>
              {suggestions.map((s, i) => (
                <button key={i} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b last:border-0" style={{ borderColor: "#F1F5F9" }}
                  onMouseDown={() => { onSelect(s); setSuggestions([]); setOpen(false); }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.type === "stop" ? "🚏" : "📍"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: "#1B2B6B" }}>{s.place_name}</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: "#94A3B8" }}>{s.full_address}</div>
                      {s.type === "place" && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{ background: AGENCY_BADGE[s.nearest_stop.agency]?.bg }}>
                            {AGENCY_BADGE[s.nearest_stop.agency]?.label}
                          </span>
                          <span className="text-xs" style={{ color: "#94A3B8" }}>{s.nearest_stop.stop_name} · {s.nearest_stop.distance_m}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onGPS} disabled={gpsLoading}
          className="rounded-xl px-4 font-bold text-white text-lg transition-opacity hover:opacity-80"
          style={{ background: "#1B2B6B", minWidth: 48 }}>
          {gpsLoading ? "⏳" : "📍"}
        </button>
      </div>
      {nearest && (
        <div className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: "#64748B" }}>
          <span className="px-1.5 py-0.5 rounded text-white" style={{ background: AGENCY_BADGE[nearest.agency]?.bg, fontSize: 10 }}>
            {AGENCY_BADGE[nearest.agency]?.label}
          </span>
          {nearest.stop_name}{nearest.distance_m > 0 && ` · ${nearest.distance_m}m`}
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
  const [showMap, setShowMap] = useState(false);

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
    const fromQuery = fromStop?.stop_name;
    const toQuery = toStop?.stop_name;
    if (!fromQuery || !toQuery) { setError("Pilih lokasi dari dropdown dulu ya!"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/api/route?from_stop=${encodeURIComponent(fromQuery)}&to_stop=${encodeURIComponent(toQuery)}`);
      if (!res.ok) { const e = await res.json(); setError(e.detail); return; }
      const data = await res.json();
      setResult(data);
      setShowMap(false);
    } catch { setError("Gagal konek ke server!"); }
    finally { setLoading(false); }
  };

  const fare = result ? estimateFare(result.steps) : null;

  // Group steps by agency/line
  const groupedSteps = result ? (() => {
    const groups: { agency: string; route: string; color: string; stops: Step[] }[] = [];
    let currentGroup: { agency: string; route: string; color: string; stops: Step[] } | null = null;
    result.steps.forEach((step) => {
      if (step.change_to || !currentGroup) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          agency: step.change_agency || step.agency,
          route: step.change_to || "",
          color: AGENCY_BADGE[step.change_agency || step.agency]?.bg || "#1B2B6B",
          stops: [step]
        };
      } else {
        currentGroup.stops.push(step);
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  })() : [];

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
            <LocationInput label="Lokasi Asal" icon="🔵" value={from}
              onChange={(v) => { setFrom(v); setFromStop(null); }}
              onSelect={(r) => { setFrom(r.place_name); setFromStop(r.nearest_stop); }}
              onGPS={() => getGPS("from")} gpsLoading={gpsLoading === "from"} nearest={fromStop} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
              <button onClick={() => { setFrom(to); setTo(from); setFromStop(toStop); setToStop(fromStop); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold hover:opacity-80"
                style={{ background: "#1B2B6B" }}>⇅</button>
              <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
            </div>
            <LocationInput label="Lokasi Tujuan" icon="🔴" value={to}
              onChange={(v) => { setTo(v); setToStop(null); }}
              onSelect={(r) => { setTo(r.place_name); setToStop(r.nearest_stop); }}
              onGPS={() => getGPS("to")} gpsLoading={gpsLoading === "to"} nearest={toStop} />
            <button onClick={searchRoute} disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide hover:opacity-90 disabled:opacity-40"
              style={{ background: "#1B2B6B" }}>
              {loading ? "Mencari rute terbaik..." : "Cari Rute →"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4 text-sm font-medium" style={{ background: "#FEE2E2", color: "#991B1B" }}>❌ {error}</div>
        )}

        {result && (
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8" style={{ background: "#fff" }}>
            {/* Route Summary */}
            <div className="px-5 py-4" style={{ background: "#1B2B6B" }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#93C5FD" }}>RUTE TERBAIK</div>
                  <div className="font-bold text-white">{result.from}</div>
                  <div className="text-xs my-0.5" style={{ color: "#93C5FD" }}>↓ menuju</div>
                  <div className="font-bold text-white">{result.to}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-white">{result.total_stops}</div>
                  <div className="text-xs" style={{ color: "#93C5FD" }}>halte</div>
                </div>
              </div>
              {/* Fare */}
              {fare && (
                <div className="rounded-xl p-3 mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="flex justify-between items-center">
                    <div className="text-xs" style={{ color: "#93C5FD" }}>Estimasi Biaya</div>
                    <div className="font-bold text-white text-lg">{formatRupiah(fare.total)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fare.breakdown.map((b, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                        {b.label}: {formatRupiah(b.fare)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Toggle Map */}
              <button onClick={() => setShowMap(!showMap)}
                className="w-full mt-3 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                {showMap ? "📋 Lihat Detail Rute" : "🗺️ Lihat di Peta"}
              </button>
            </div>

            {/* Map */}
            {showMap && (
              <div style={{ height: 320 }}>
                <MapView steps={result.steps} />
              </div>
            )}

            {/* Route Timeline */}
            {!showMap && (
              <div className="px-5 py-4">
                {groupedSteps.map((group, gi) => (
                  <div key={gi} className="mb-4 last:mb-0">
                    {/* Line header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-white text-xs font-bold" style={{ background: group.color }}>
                        {AGENCY_BADGE[group.agency]?.label} {group.route && `· ${group.route}`}
                      </span>
                      <span className="text-xs" style={{ color: "#94A3B8" }}>{group.stops.length} halte</span>
                    </div>
                    {/* Stops */}
                    <div className="ml-2 border-l-2 pl-4" style={{ borderColor: group.color }}>
                      {group.stops.map((stop, si) => (
                        <div key={si} className="flex items-center gap-2 py-1.5 relative">
                          <div className="absolute -left-5 w-3 h-3 rounded-full border-2" style={{
                            background: stop.type === "start" ? group.color : stop.type === "end" ? "#DC2626" : "#fff",
                            borderColor: stop.type === "end" ? "#DC2626" : group.color
                          }} />
                          <span className="text-sm" style={{
                            color: stop.type === "start" ? "#1B2B6B" : stop.type === "end" ? "#DC2626" : "#475569",
                            fontWeight: stop.type === "start" || stop.type === "end" ? 700 : 400
                          }}>
                            {stop.stop_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
