import pandas as pd
import os

def explore_gtfs(folder_path):
    print(f"\n=== Exploring: {folder_path} ===\n")
    
    files = ['agency.txt', 'routes.txt', 'stops.txt', 
             'trips.txt', 'stop_times.txt', 'calendar.txt']
    
    for file in files:
        path = os.path.join(folder_path, file)
        if os.path.exists(path):
            df = pd.read_csv(path)
            print(f"✅ {file}")
            print(f"   Jumlah data: {len(df)} rows")
            print(f"   Kolom: {list(df.columns)}\n")
        else:
            print(f"❌ {file} - tidak ada\n")

# Ganti path sesuai folder kamu
explore_gtfs(r"C:\Users\LENOVO\jakroute\data\transjakarta\transitland")
explore_gtfs(r"C:\Users\LENOVO\jakroute\data\transjakarta\akherlan")