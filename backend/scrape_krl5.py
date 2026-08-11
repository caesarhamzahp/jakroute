import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# API dari repo dialkq/rute-krl
endpoints = [
    "https://rute-krl.vercel.app/api/station",
    "https://krl.qlm.one/api/station",
]

for url in endpoints:
    print(f"\n=== Coba: {url} ===")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Jumlah stasiun: {len(data)}")
            print(f"Preview: {json.dumps(data[:3], indent=2)}")
        else:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")    