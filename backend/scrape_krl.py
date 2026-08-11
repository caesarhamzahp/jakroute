import requests
from bs4 import BeautifulSoup
import json

def scrape_krl_stations():
    url = "https://commuterline.id/perjalanan-krl/peta-rute"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    print("Mengambil data dari commuterline.id...")
    response = requests.get(url, headers=headers, timeout=10)
    
    if response.status_code != 200:
        print(f"Gagal: status code {response.status_code}")
        return None
    
    print("Berhasil ambil halaman!")
    soup = BeautifulSoup(response.text, "lxml")
    print("\nTitle halaman:", soup.title.text if soup.title else "tidak ada")
    
    # Simpan HTML untuk kita analisa
    with open("krl_page.html", "w", encoding="utf-8") as f:
        f.write(response.text)
    print("\nHTML disimpan ke krl_page.html")
    print("Ukuran halaman:", len(response.text), "karakter")

scrape_krl_stations()