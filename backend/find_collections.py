
import re

filepath = 'backend/server.py'
output_path = 'backend/db_collections.txt'

collections = set()
ignore_methods = {
    'find_one', 'insert_one', 'update_one', 'delete_one', 'delete_many', 
    'update_many', 'aggregate', 'count_documents', 'create_index', 'find',
    'drop', 'list_collection_names', 'command', 'client', 'session'
}

print(f"Scanning {filepath}...")

with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
    
    # Bracket notation: db["collection_name"] or db['collection_name']
    matches = re.finditer(r'db\[["\'](.*?)["\']\]', content)
    for match in matches:
        collections.add(match.group(1))

    # Dot notation: db.collection_name (heuristically)
    # This matches db.some_name.some_method
    matches = re.finditer(r'db\.([a-zA-Z0-9_]+)', content)
    for match in matches:
        name = match.group(1)
        if name not in ignore_methods:
            collections.add(name)

with open(output_path, 'w') as f:
    for c in sorted(collections):
        f.write(f"{c}\n")

print(f"Found {len(collections)} potential collections.")
