from math import radians, sin, cos, sqrt, atan2
import json

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

TRANSFER_EDGES = [
    ("MRT-DKA", "LRT-DKA", 50, "Dukuh Atas MRT-LRT"),
    ("MRT-DKA", "B02503P", 200, "Dukuh Atas MRT-TJ"),
    ("LRT-DKA", "B02503P", 200, "Dukuh Atas LRT-TJ"),
    ("MRT-BLM", "P00017", 100, "Blok M MRT-TJ"),
    ("MRT-BLM", "B08540P", 150, "Blok M MRT-TJ Jalur"),
    ("LRT-KRM", "B07106P", 100, "Kampung Rambutan LRT-TJ"),
    ("LRT-KRM", "H00096P", 200, "Kampung Rambutan LRT-TJ 2"),
    ("LRT-CWG", "B02431P", 400, "Cawang LRT-TJ"),
    ("KRL-MRI", "B02348P", 300, "Manggarai KRL-TJ"),
    ("KRL-TNB", "B01372P", 400, "Tanah Abang KRL-TJ"),
    ("KRL-JUA", "B00878P", 200, "Juanda KRL-TJ"),
    ("KRL-JK", "B00001P", 300, "Kota KRL-TJ"),
    ("MRT-SNY", "G00015", 300, "Senayan MRT-TJ"),
    ("MRT-IST", "B00589P", 200, "Istora MRT-TJ"),
    ("MRT-BHI", "B00313P", 200, "Bundaran HI MRT-TJ"),
    ("MRT-LBB", "B05566P", 300, "Lebak Bulus MRT-TJ"),
    ("KRL-JNG", "B01234P", 350, "Jatinegara KRL-TJ"),
]

def transfer_weight(distance_m):
    walk_time = distance_m / 1.2
    overhead = 180
    return (walk_time + overhead) / 90

edges = []
for edge in TRANSFER_EDGES:
    node1, node2, dist, desc = edge
    weight = transfer_weight(dist)
    edges.append({"from": node1, "to": node2, "weight": round(weight, 2), "distance_m": dist, "description": desc, "type": "transfer"})
    edges.append({"from": node2, "to": node1, "weight": round(weight, 2), "distance_m": dist, "description": desc, "type": "transfer"})

with open(r"C:\Users\LENOVO\jakroute\data\transfer_edges.json", "w") as f:
    json.dump(edges, f, indent=2)

print(f"Generated {len(edges)} transfer edges")
