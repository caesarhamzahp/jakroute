import requests
import json

# API tidak resmi tapi reliable - dipakai banyak developer Indonesia
url = "https://api-doc-hmns.vercel.app/krl/stations"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

print("Mencoba API komunitas KRL...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Tipe data: {type(data)}")
    print(f"Preview: {json.dumps(data, indent=2)[:500]}")
except Exception as e:
    print(f"Error: {e}")