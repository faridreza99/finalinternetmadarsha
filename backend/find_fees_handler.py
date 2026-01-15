
import os

filepath = 'backend/server.py'

print(f"Searching {filepath}...")

count = 0
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    for i, line in enumerate(f):
        if 'db[' in line or 'db.' in line:
            print(f"Line {i+1}: {line.strip()}")
            count += 1
            if count > 200:
                print("Limit reached.")
                break

print("Search complete.")
