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

interface RouteOption {
  label: string;
  icon: string;
  from: string;
  to: string;
  total_stops: number;
  transfers: number;
  estimated_fare: number;
  agencies: string[];
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

const AGENCY: Record<string, { bg: string; label: string }> = {
  TJ:       { bg: "#1B2B6B", label: "Transjakarta" },
  MRT:      { bg: "#0070C0", label: "MRT Jakarta" },
  LRT:      { bg: "#E87722", label: "LRT Jabodebek" },
  KRL:      { bg: "#2D7D2F", label: "KRL Commuterline" },
  TRANSFER: { bg: "#64748B", label: "Jalan Kaki" },
};

const API = "http://localhost:8000";

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function estimateTime(stops: number, transfers: number) {
  const mins = stops * 2 + transfers * 5;
  return mins < 60 ? `~${mins} menit` : `~${Math.floor(mins/60)}j ${mins%60}m`;
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
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          />
          {searching && <div className="absolute right-3 top-3.5 animate-pulse" style={{ color: "#1B2B6B" }}>🔍</div>}
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0" }}>
              {suggestions.map((s, i) => (
                <button key={i} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b last:border-0"
                  style={{ borderColor: "#F1F5F9" }}
                  onMouseDown={() => { onSelect(s); setSuggestions([]); setOpen(false); }}>
                  <div className="flex items-center gap-2">
                    <span>{s.type === "stop" ? "🚏" : "📍"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: "#1B2B6B" }}>{s.place_name}</div>
                      <div className="text-xs truncate" style={{ color: "#94A3B8" }}>{s.full_address}</div>
                      {s.type === "place" && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-white text-xs" style={{ background: AGENCY[s.nearest_stop.agency]?.bg }}>
                            {AGENCY[s.nearest_stop.agency]?.label}
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
          className="rounded-xl px-4 text-white text-lg hover:opacity-80"
          style={{ background: "#1B2B6B", minWidth: 48 }}>
          {gpsLoading ? "⏳" : "📍"}
        </button>
      </div>
      {nearest && (
        <div className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: "#64748B" }}>
          <span className="px-1.5 py-0.5 rounded text-white" style={{ background: AGENCY[nearest.agency]?.bg, fontSize: 10 }}>
            {AGENCY[nearest.agency]?.label}
          </span>
          {nearest.stop_name}{nearest.distance_m > 0 && ` · ${nearest.distance_m}m`}
        </div>
      )}
    </div>
  );
}

function RouteTimeline({ steps }: { steps: Step[] }) {
  const groups: { agency: string; route: string; color: string; stops: Step[] }[] = [];
  let cur: { agency: string; route: string; color: string; stops: Step[] } | null = null;

  steps.forEach((step) => {
    if (step.change_to || !cur) {
      if (cur) groups.push(cur);
      cur = {
        agency: step.change_agency || step.agency,
        route: step.change_to || "",
        color: AGENCY[step.change_agency || step.agency]?.bg || "#1B2B6B",
        stops: [step]
      };
    } else {
      cur.stops.push(step);
    }
  });
  if (cur) groups.push(cur);

  return (
    <div className="px-5 py-4 space-y-5">
      {groups.map((group, gi) => (
        <div key={gi}>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-white text-xs font-bold" style={{ background: group.color }}>
              {AGENCY[group.agency]?.label || group.agency}
              {group.route && group.agency !== "TRANSFER" && ` · ${group.route}`}
            </span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              {group.agency === "TRANSFER" ? "±5 menit jalan kaki" : `${group.stops.length} halte`}
            </span>
          </div>
          <div className="ml-2 border-l-2 pl-4 space-y-0.5" style={{ borderColor: group.color }}>
            {group.stops.map((stop, si) => (
              <div key={si} className="flex items-center gap-2 py-1 relative">
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
  );
}

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromStop, setFromStop] = useState<NearestStop | null>(null);
  const [toStop, setToStop] = useState<NearestStop | null>(null);
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  const getGPS = async (type: "from" | "to") => {
    if (!navigator.geolocation) { setError("Browser tidak support GPS"); return; }
    setGpsLoading(type); setError("");
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
    setLoading(true); setError(""); setOptions([]); setShowMap(false);
    try {
      const fromId = fromStop?.stop_id || ""
      const toId = toStop?.stop_id || ""
      const res = await fetch(`${API}/api/route/options?from_stop=${encodeURIComponent(fromQuery)}&to_stop=${encodeURIComponent(toQuery)}&from_id=${encodeURIComponent(fromId)}&to_id=${encodeURIComponent(toId)}`);
      if (!res.ok) { const e = await res.json(); setError(e.detail); return; }
      const data = await res.json();
      setOptions(data.options || []);
      setSelected(0);
    } catch { setError("Gagal konek ke server!"); }
    finally { setLoading(false); }
  };

  const current = options[selected];

  return (
    <main className="min-h-screen" style={{ background: "#F1F5F9" }}>
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
              {loading ? "Mencari rute..." : "Cari Rute →"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4 text-sm font-medium" style={{ background: "#FEE2E2", color: "#991B1B" }}>❌ {error}</div>
        )}

        {/* Route Option Tabs */}
        {options.length > 0 && (
          <div className="flex gap-2 mb-3">
            {options.map((opt, i) => (
              <button key={i} onClick={() => { setSelected(i); setShowMap(false); }}
                className="flex-1 rounded-xl py-3 px-3 text-center transition-all border-2"
                style={{
                  background: selected === i ? "#1B2B6B" : "#fff",
                  borderColor: selected === i ? "#1B2B6B" : "#E2E8F0",
                  color: selected === i ? "#fff" : "#1B2B6B"
                }}>
                <div className="text-xl mb-1">{opt.icon}</div>
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-xs mt-1 opacity-80">{formatRupiah(opt.estimated_fare)}</div>
                <div className="text-xs opacity-60">{estimateTime(opt.total_stops, opt.transfers)}</div>
              </button>
            ))}
          </div>
        )}

        {/* Route Detail */}
        {current && (
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8" style={{ background: "#fff" }}>
            {/* Header */}
            <div className="px-5 py-4" style={{ background: "#1B2B6B" }}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{current.from}</div>
                  <div className="text-xs my-0.5" style={{ color: "#93C5FD" }}>↓ menuju</div>
                  <div className="font-bold text-white text-sm">{current.to}</div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-extrabold text-white">{current.total_stops}</div>
                  <div className="text-xs" style={{ color: "#93C5FD" }}>halte</div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="font-bold text-white text-sm">{formatRupiah(current.estimated_fare)}</div>
                  <div className="text-xs" style={{ color: "#93C5FD" }}>Estimasi</div>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="font-bold text-white text-sm">{estimateTime(current.total_stops, current.transfers)}</div>
                  <div className="text-xs" style={{ color: "#93C5FD" }}>Estimasi waktu</div>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="flex flex-wrap justify-center gap-1">
                    {current.agencies.filter(a => a !== "TRANSFER").map((a, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded font-bold text-white" style={{ background: AGENCY[a]?.bg || "#fff3" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#93C5FD" }}>Moda</div>
                </div>
              </div>

              {/* Moda badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {current.agencies.filter(a => a !== "TRANSFER").map((a, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ background: "rgba(255,255,255,0.15)" }}>
                    {AGENCY[a]?.label}
                  </span>
                ))}
              </div>

              <button onClick={() => setShowMap(!showMap)}
                className="w-full py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                {showMap ? "📋 Detail Rute" : "🗺️ Lihat di Peta"}
              </button>
            </div>

            {showMap ? (
              <div style={{ height: 320 }}>
                <MapView steps={current.steps} />
              </div>
            ) : (
              <RouteTimeline steps={current.steps} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

