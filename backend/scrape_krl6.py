import requests
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

url = "https://rute-krl.vercel.app/api/station"
print(f"=== Coba: {url} ===")
try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Tipe data: {type(data)}")
    print(f"Raw response:\n{json.dumps(data, indent=2)}")
except Exception as e:
    print(f"Error: {e}")