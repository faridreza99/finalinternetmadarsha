
import os

filepath = 'backend/server.py'
search_term = 'অজ্ঞাত শ্রেণি'

print(f"Searching {filepath} for '{search_term}'...")

with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if search_term in line:
            print(f"Line {i+1}: {line.strip()}")

print("Search complete.")
