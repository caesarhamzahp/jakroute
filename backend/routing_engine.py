import gtfs_kit as gk
import networkx as nx
import pandas as pd
import json

# Load data GTFS Transjakarta
print("Loading GTFS data...")
feed = gk.read_feed(
    r"C:\Users\LENOVO\jakroute\data\transjakarta\transitland", 
    dist_units="km"
)

print(f"✅ Routes: {len(feed.routes)}")
print(f"✅ Stops: {len(feed.stops)}")
print(f"✅ Trips: {len(feed.trips)}")
print(f"✅ Stop times: {len(feed.stop_times)}")

# Bangun graph
print("\nMembangun graph...")
G = nx.DiGraph()

# Tambah semua halte sebagai node
for _, stop in feed.stops.iterrows():
    G.add_node(
        stop.stop_id,
        name=stop.stop_name,
        lat=stop.stop_lat,
        lon=stop.stop_lon
    )

# Tambah koneksi antar halte berdasarkan stop_times
stop_times = feed.stop_times.sort_values(["trip_id", "stop_sequence"])
    
for trip_id, group in stop_times.groupby("trip_id"):
    stops_in_trip = group["stop_id"].tolist()
    for i in range(len(stops_in_trip) - 1):
        from_stop = stops_in_trip[i]
        to_stop = stops_in_trip[i + 1]
        G.add_edge(from_stop, to_stop, trip_id=trip_id, weight=1)

print(f"✅ Graph nodes (halte): {G.number_of_nodes()}")
print(f"✅ Graph edges (koneksi): {G.number_of_edges()}")

# Test cari rute
print("\n=== Test Pencarian Rute ===")

# Cari halte Blok M dan Monas
blokm = feed.stops[feed.stops.stop_name.str.contains("Blok M", case=False, na=False)]
monas = feed.stops[feed.stops.stop_name.str.contains("Monas", case=False, na=False)]

print(f"\nHalte Blok M ditemukan: {len(blokm)}")
print(blokm[["stop_id", "stop_name"]].head())

print(f"\nHalte Monas ditemukan: {len(monas)}")
print(monas[["stop_id", "stop_name"]].head())