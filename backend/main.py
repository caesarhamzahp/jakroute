import json
import httpx
from math import radians, sin, cos, sqrt, atan2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gtfs_kit as gk
import networkx as nx

app = FastAPI(title="JakRoute API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

print("Loading GTFS Transjakarta...")
GTFS_PATH = r"C:\Users\LENOVO\jakroute\data\transjakarta\transitland"
feed = gk.read_feed(GTFS_PATH, dist_units="km")

G = nx.DiGraph()
for _, stop in feed.stops.iterrows():
    G.add_node(stop.stop_id, name=stop.stop_name, lat=float(stop.stop_lat), lon=float(stop.stop_lon), agency="TJ")

stop_times = feed.stop_times.sort_values(["trip_id", "stop_sequence"])
trip_routes = feed.trips.set_index("trip_id")["route_id"].to_dict()
routes_info = feed.routes.set_index("route_id")[["route_short_name", "route_long_name"]].to_dict("index")

for trip_id, group in stop_times.groupby("trip_id"):
    stops_in_trip = group["stop_id"].tolist()
    route_id = trip_routes.get(trip_id, "")
    route_name = routes_info.get(route_id, {}).get("route_short_name", "")
    for i in range(len(stops_in_trip) - 1):
        G.add_edge(stops_in_trip[i], stops_in_trip[i+1], route_id=route_id, route_name=route_name, agency="TJ", weight=1)

print(f"✅ Transjakarta: {G.number_of_nodes()} halte, {G.number_of_edges()} koneksi")

def load_json_transit(filepath, agency_id):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        stations_added = 0
        edges_added = 0
        for line in data.get("lines", []):
            line_id = line["line_id"]
            line_name = line["line_name"]
            stations = line["stations"]
            for station in stations:
                if station["id"] not in G:
                    G.add_node(station["id"], name=station["name"], lat=station["lat"], lon=station["lon"], agency=agency_id)
                    stations_added += 1
            for i in range(len(stations) - 1):
                G.add_edge(stations[i]["id"], stations[i+1]["id"], route_id=line_id, route_name=line_name, agency=agency_id, weight=1)
                G.add_edge(stations[i+1]["id"], stations[i]["id"], route_id=line_id, route_name=line_name, agency=agency_id, weight=1)
                edges_added += 2
        print(f"✅ {agency_id}: {stations_added} stasiun, {edges_added} koneksi")
    except Exception as e:
        print(f"❌ Gagal load {agency_id}: {e}")

BASE_DATA = r"C:\Users\LENOVO\jakroute\data"
load_json_transit(f"{BASE_DATA}\\mrt\\stations.json", "MRT")
load_json_transit(f"{BASE_DATA}\\lrt\\stations.json", "LRT")
load_json_transit(f"{BASE_DATA}\\krl\\stations.json", "KRL")

print(f"✅ Total graph: {G.number_of_nodes()} node, {G.number_of_edges()} edge")

def find_nearest_node(lat, lon):
    min_dist = float("inf")
    nearest = None
    for node_id, data in G.nodes(data=True):
        d = haversine(lat, lon, data["lat"], data["lon"])
        if d < min_dist:
            min_dist = d
            nearest = node_id
    return nearest, min_dist

@app.get("/")
def root():
    return {"message": "JakRoute API", "status": "running"}

@app.get("/api/stops/search")
def search_stops(q: str):
    results = []
    for node_id, data in G.nodes(data=True):
        if q.lower() in data["name"].lower():
            results.append({"stop_id": node_id, "stop_name": data["name"], "stop_lat": data["lat"], "stop_lon": data["lon"], "agency": data.get("agency", "")})
    return {"results": results[:20]}

@app.get("/api/nearest")
def get_nearest(lat: float, lon: float):
    nearest_id, dist = find_nearest_node(lat, lon)
    node = G.nodes[nearest_id]
    return {"stop_id": nearest_id, "stop_name": node["name"], "lat": node["lat"], "lon": node["lon"], "agency": node.get("agency"), "distance_m": round(dist)}

@app.get("/api/geocode")
async def geocode(q: str):
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": f"{q}, Jakarta, Indonesia",
                    "format": "json",
                    "limit": 5,
                    "countrycodes": "id",
                },
                headers={"User-Agent": "JakRoute/1.0"},
                timeout=10
            )
            results = res.json()
            if not results or not isinstance(results, list):
                raise HTTPException(status_code=404, detail=f"Lokasi tidak ditemukan")
            places = []
            for r in results:
                try:
                    lat = float(r["lat"])
                    lon = float(r["lon"])
                    nearest_id, dist = find_nearest_node(lat, lon)
                    nearest = G.nodes[nearest_id]
                    places.append({
                        "place_name": r.get("display_name", "").split(",")[0],
                        "full_address": r.get("display_name", ""),
                        "lat": lat,
                        "lon": lon,
                        "nearest_stop": {
                            "stop_id": nearest_id,
                            "stop_name": nearest["name"],
                            "agency": nearest.get("agency", "TJ"),
                            "distance_m": round(dist)
                        }
                    })
                except Exception:
                    continue
            if not places:
                raise HTTPException(status_code=404, detail=f"Lokasi tidak ditemukan")
            return {"results": places}
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout saat geocoding")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout saat geocoding")

@app.get("/api/route")
def get_route(from_stop: str, to_stop: str):
    dari_nodes = [(nid, d) for nid, d in G.nodes(data=True) if from_stop.lower() in d["name"].lower()]
    ke_nodes = [(nid, d) for nid, d in G.nodes(data=True) if to_stop.lower() in d["name"].lower()]

    if not dari_nodes:
        raise HTTPException(status_code=404, detail=f"Halte '{from_stop}' tidak ditemukan")
    if not ke_nodes:
        raise HTTPException(status_code=404, detail=f"Halte '{to_stop}' tidak ditemukan")

    rute_terbaik = None
    dari_terbaik = None
    ke_terbaik = None

    for dari_id, dari_data in dari_nodes:
        for ke_id, ke_data in ke_nodes:
            try:
                path = nx.shortest_path(G, dari_id, ke_id, weight="weight")
                if rute_terbaik is None or len(path) < len(rute_terbaik):
                    rute_terbaik = path
                    dari_terbaik = (dari_id, dari_data)
                    ke_terbaik = (ke_id, ke_data)
            except nx.NetworkXNoPath:
                continue

    if rute_terbaik is None:
        raise HTTPException(status_code=404, detail="Tidak ada rute yang ditemukan")

    steps = []
    prev_route = None
    for i, stop_id in enumerate(rute_terbaik):
        stop = G.nodes[stop_id]
        step = {
            "stop_id": stop_id,
            "stop_name": stop["name"],
            "lat": stop["lat"],
            "lon": stop["lon"],
            "agency": stop.get("agency", ""),
            "type": "start" if i == 0 else "end" if i == len(rute_terbaik)-1 else "stop"
        }
        if i < len(rute_terbaik) - 1:
            edge = G[stop_id][rute_terbaik[i+1]]
            route_name = edge.get("route_name", "")
            if route_name != prev_route:
                step["change_to"] = route_name
                step["change_agency"] = edge.get("agency", "")
                prev_route = route_name
        steps.append(step)

    return {
        "from": dari_terbaik[1]["name"],
        "to": ke_terbaik[1]["name"],
        "total_stops": len(rute_terbaik),
        "steps": steps
    }

@app.get("/api/route/coords")
def get_route_by_coords(from_lat: float, from_lon: float, to_lat: float, to_lon: float):
    from_id, _ = find_nearest_node(from_lat, from_lon)
    to_id, _ = find_nearest_node(to_lat, to_lon)
    from_node = G.nodes[from_id]
    to_node = G.nodes[to_id]
    return get_route(from_node["name"], to_node["name"])

