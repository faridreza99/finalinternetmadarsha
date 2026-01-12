
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

print("Attempting to import server module...")
try:
    import server
    print("Successfully imported server module.")
except Exception as e:
    print(f"Failed to import server module: {e}")
    import traceback
    traceback.print_exc()
except SystemExit as e:
    print(f"SystemExit during import: {e}")
