"""
Script untuk tambah transfer edges antar moda transportasi
Jalankan sekali untuk generate transfer_edges.json
"""
import json
from math import radians, sin, cos, sqrt, atan2

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

# Titik transfer manual yang sudah diverifikasi
# Format: (node_id_1, node_id_2, jarak_meter, deskripsi)
TRANSFER_EDGES = [
    # Dukuh Atas — hub utama (TJ + MRT + LRT + KRL)
    ("MRT-DKA", "LRT-DKA", 50, "Dukuh Atas MRT-LRT"),
    ("MRT-DKA", "B02503P", 200, "Dukuh Atas MRT-TJ"),  # Halte TJ Dukuh Atas
    ("LRT-DKA", "B02503P", 200, "Dukuh Atas LRT-TJ"),
    ("MRT-DKA", "KRL-MRI", 800, "Dukuh Atas MRT - Manggarai KRL"),

    # Blok M — TJ + MRT
    ("MRT-BLM", "P00017", 100, "Blok M MRT-TJ"),       # Halte TJ Blok M
    ("MRT-BLM", "B08540P", 150, "Blok M MRT-TJ Jalur"),

    # Manggarai — TJ + KRL
    ("KRL-MRI", "B02348P", 300, "Manggarai KRL-TJ"),

    # Tanah Abang — TJ + KRL  
    ("KRL-TNB", "B01372P", 400, "Tanah Abang KRL-TJ"),

    # Juanda — TJ + KRL
    ("KRL-JUA", "B00878P", 200, "Juanda KRL-TJ"),

    # Jakarta Kota — TJ + KRL
    ("KRL-JK", "B00001P", 300, "Kota KRL-TJ"),

    # Cawang — TJ + LRT
    ("LRT-CWG", "B02431P", 400, "Cawang LRT-TJ"),

    # Jatinegara — TJ + KRL
    ("KRL-JNG", "B01234P", 350, "Jatinegara KRL-TJ"),

    # Senayan — TJ + MRT
    ("MRT-SNY", "G00015", 300, "Senayan MRT-TJ"),

    # Istora — TJ + MRT
    ("MRT-IST", "B00589P", 200, "Istora MRT-TJ"),

    # Bundaran HI — TJ + MRT
    ("MRT-BHI", "B00313P", 200, "Bundaran HI MRT-TJ"),

    # Lebak Bulus — MRT + TJ
    ("MRT-LBB", "B05566P", 300, "Lebak Bulus MRT-TJ"),

    # Halim — LRT + TJ
    ("LRT-HLM", "B04521P", 500, "Halim LRT-TJ"),
]

# Walking speed ~1.2 m/s, transfer penalty = jarak/1.2 + 3 menit overhead
def transfer_weight(distance_m):
    walk_time = distance_m / 1.2  # detik
    overhead = 180  # 3 menit overhead naik/turun
    # Normalize ke "jumlah halte equivalent" — 1 halte ≈ 90 detik
    return (walk_time + overhead) / 90

edges = []
for edge in TRANSFER_EDGES:
    node1, node2, dist, desc = edge
    weight = transfer_weight(dist)
    edges.append({
        "from": node1,
        "to": node2,
        "weight": round(weight, 2),
        "distance_m": dist,
        "description": desc,
        "type": "transfer"
    })
    # Bidirectional
    edges.append({
        "from": node2,
        "to": node1,
        "weight": round(weight, 2),
        "distance_m": dist,
        "description": desc,
        "type": "transfer"
    })

with open("../data/transfer_edges.json", "w") as f:
    json.dump(edges, f, indent=2)

print(f"✅ Generated {len(edges)} transfer edges")
for e in edges[:5]:
    print(f"  {e['from']} → {e['to']} (weight: {e['weight']}, {e['distance_m']}m)")