import gtfs_kit as gk
import networkx as nx

print("Loading GTFS data...")
feed = gk.read_feed(
    r"C:\Users\LENOVO\jakroute\data\transjakarta\transitland",
    dist_units="km"
)

# Bangun graph
G = nx.DiGraph()
for _, stop in feed.stops.iterrows():
    G.add_node(stop.stop_id, name=stop.stop_name, lat=stop.stop_lat, lon=stop.stop_lon)

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
            trip_id=trip_id,
            route_id=route_id,
            route_name=route_name,
            weight=1
        )

print("✅ Graph siap!\n")

# Fungsi cari rute
def cari_rute(dari_nama, ke_nama):
    # Cari stop_id
    dari_stops = feed.stops[feed.stops.stop_name.str.contains(dari_nama, case=False, na=False)]
    ke_stops = feed.stops[feed.stops.stop_name.str.contains(ke_nama, case=False, na=False)]
    
    if dari_stops.empty or ke_stops.empty:
        print("Halte tidak ditemukan!")
        return
    
    # Coba semua kombinasi, ambil yang terpendek
    rute_terbaik = None
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
        print(f"Tidak ada rute dari {dari_nama} ke {ke_nama}")
        return
    
    print(f"🚌 Rute: {dari_terbaik.stop_name} → {ke_terbaik.stop_name}")
    print(f"📍 Jumlah halte: {len(rute_terbaik)}")
    print(f"\nDetail perjalanan:")
    
    prev_route = None
    for i, stop_id in enumerate(rute_terbaik):
        stop_name = G.nodes[stop_id]["name"]
        if i < len(rute_terbaik) - 1:
            edge = G[stop_id][rute_terbaik[i+1]]
            route_name = edge.get("route_name", "")
            if route_name != prev_route:
                print(f"\n  🔄 Naik jurusan: {route_name}")
                prev_route = route_name
        print(f"  {'🔵' if i == 0 else '🔴' if i == len(rute_terbaik)-1 else '⚪'} {stop_name}")

# Test rute
print("="*50)
cari_rute("Blok M", "Monas")
print("\n" + "="*50)
cari_rute("Kampung Melayu", "Kota")