import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# API resmi KAI Commuter yang dipakai apps komunitas
endpoints = [
    "https://api-partner.krl.co.id/krlweb/v1/station-info?stationfromid=MRI&stationcount=10",
    "https://api-partner.krl.co.id/krlweb/v1/kr-journey",
]

for url in endpoints:
    print(f"\n=== Coba: {url} ===")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2)[:500])
        else:
            print(f"Response: {response.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")