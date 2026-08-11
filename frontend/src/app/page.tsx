"use client";
import { useState } from "react";

interface Step {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
  type: string;
  change_to?: string;
}

interface RouteResult {
  from: string;
  to: string;
  total_stops: number;
  steps: Step[];
}

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchRoute = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `http://localhost:8000/api/route?from_stop=${encodeURIComponent(from)}&to_stop=${encodeURIComponent(to)}`
      );
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail);
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Gagal konek ke server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400">JakRoute</h1>
          <p className="text-gray-400 mt-1">Cari rute Transjakarta terbaik</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 mb-6 space-y-3">
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Dari mana? (contoh: Blok M)"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ke mana? (contoh: Monas)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button
            onClick={searchRoute}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "Mencari rute..." : "Cari Rute"}
          </button>
        </div>
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6 text-red-300">
            {error}
          </div>
        )}
        {result && (
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{result.from} ke {result.to}</h2>
              <span className="text-sm bg-green-900 text-green-300 px-3 py-1 rounded-full">
                {result.total_stops} halte
              </span>
            </div>
            <div className="space-y-1">
              {result.steps.map((step, i) => (
                <div key={i}>
                  {step.change_to && (
                    <div className="flex items-center gap-2 my-2 ml-4">
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full">
                        Naik jurusan {step.change_to}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {step.type === "start" ? "🔵" : step.type === "end" ? "🔴" : "⚪"}
                    </span>
                    <span className={step.type === "start" || step.type === "end" ? "font-semibold" : "text-gray-400"}>
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
