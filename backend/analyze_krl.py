from bs4 import BeautifulSoup

with open("krl_page.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "lxml")

# Cari semua text yang mengandung nama stasiun
print("=== Mencari elemen dengan kata 'stasiun' ===")
elements = soup.find_all(string=lambda text: text and "stasiun" in text.lower())
for el in elements[:20]:
    print(f"Tag: {el.parent.name} | Text: {el.strip()[:100]}")

print("\n=== Semua tag <a> yang ada ===")
links = soup.find_all("a", href=True)
for link in links[:30]:
    print(f"href: {link['href']} | text: {link.text.strip()[:60]}")