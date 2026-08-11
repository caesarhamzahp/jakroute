import requests
from bs4 import BeautifulSoup
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Coba halaman info tarif
urls = [
    "https://kci.id/perjalanan-krl/info-tarif",
    "https://kci.id/perjalanan-krl/jadwal-kereta",
]

for url in urls:
    print(f"\n=== Coba: {url} ===")
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Ukuran: {len(response.text)} karakter")
    
    soup = BeautifulSoup(response.text, "lxml")
    
    # Cari semua option (dropdown stasiun)
    options = soup.find_all("option")
    if options:
        print(f"Ketemu {len(options)} option!")
        for opt in options[:20]:
            print(f"  value={opt.get('value')} | text={opt.text.strip()}")
    else:
        print("Tidak ada dropdown option")
    
    # Cari input fields
    inputs = soup.find_all("input")
    print(f"Input fields: {len(inputs)}")
    for inp in inputs[:10]:
        print(f"  name={inp.get('name')} type={inp.get('type')}")