from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gtfs_kit as gk
import networkx as nx
import os

app = FastAPI(title="JakRoute API", version="1.0.0")

# CORS biar frontend Next.js bisa akses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load GTFS & build graph saat server start
print("Loading GTFS data...")
GTFS_PATH = r"C:\Users\LENOVO\jakroute\data\transjakarta\transitland"
feed = gk.read_feed(GTFS_PATH, dist_units="km")

G = nx.DiGraph()
for _, stop in feed.stops.iterrows():
    G.add_node(
        stop.stop_id,
        name=stop.stop_name,
        lat=float(stop.stop_lat),
        lon=float(stop.stop_lon)
    )

stop_times = feed.stop_times.sort_values(["trip_id", "stop_sequence"])
trip_routes = feed.trips.set_index("trip_id")["route_id"].to_dict()
routes_info = feed.routes.set_index("route_id")[["route_short_name", "route_long_name"]].to_dict("index")

for trip_id, group in stop_times.groupby("trip_id"):
    stops_in_trip = group["stop_id"].tolist()
    route_id = trip_routes.get(trip_id, "")
    route_name = routes_info.get(route_id, {}).get("route_short_name", "")
    for i in range(len(stops_in_trip) - 1):
        G.add_edge(
            stops_in_trip[i],
            stops_in_trip[i+1],
            route_id=route_id,
            route_name=route_name,
            weight=1
        )

print(f"✅ Graph siap! {G.number_of_nodes()} halte, {G.number_of_edges()} koneksi")

# ── Endpoints ──

@app.get("/")
def root():
    return {"message": "JakRoute API", "status": "running"}

@app.get("/api/stops/search")
def search_stops(q: str):
    """Cari halte berdasarkan nama"""
    results = feed.stops[
        feed.stops.stop_name.str.contains(q, case=False, na=False)
    ][["stop_id", "stop_name", "stop_lat", "stop_lon"]]
    return {"results": results.to_dict("records")}

@app.get("/api/route")
def get_route(from_stop: str, to_stop: str):
    """Cari rute terpendek dari halte A ke halte B"""
    # Cari halte
    dari_stops = feed.stops[feed.stops.stop_name.str.contains(from_stop, case=False, na=False)]
    ke_stops = feed.stops[feed.stops.stop_name.str.contains(to_stop, case=False, na=False)]

    if dari_stops.empty:
        raise HTTPException(status_code=404, detail=f"Halte '{from_stop}' tidak ditemukan")
    if ke_stops.empty:
        raise HTTPException(status_code=404, detail=f"Halte '{to_stop}' tidak ditemukan")

    # Cari rute terpendek
    rute_terbaik = None
    dari_terbaik = None
    ke_terbaik = None

    for _, dari in dari_stops.iterrows():
        for _, ke in ke_stops.iterrows():
            try:
                path = nx.shortest_path(G, dari.stop_id, ke.stop_id, weight="weight")
                if rute_terbaik is None or len(path) < len(rute_terbaik):
                    rute_terbaik = path
                    dari_terbaik = dari
                    ke_terbaik = ke
            except nx.NetworkXNoPath:
                continue

    if rute_terbaik is None:
        raise HTTPException(status_code=404, detail="Tidak ada rute yang ditemukan")

    # Format hasil
    steps = []
    prev_route = None
    for i, stop_id in enumerate(rute_terbaik):
        stop = G.nodes[stop_id]
        step = {
            "stop_id": stop_id,
            "stop_name": stop["name"],
            "lat": stop["lat"],
            "lon": stop["lon"],
            "type": "start" if i == 0 else "end" if i == len(rute_terbaik)-1 else "stop"
        }
        if i < len(rute_terbaik) - 1:
            edge = G[stop_id][rute_terbaik[i+1]]
            route_name = edge.get("route_name", "")
            if route_name != prev_route:
                step["change_to"] = route_name
                prev_route = route_name
        steps.append(step)

    return {
        "from": dari_terbaik.stop_name,
        "to": ke_terbaik.stop_name,
        "total_stops": len(rute_terbaik),
        "steps": steps
    }