
import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient
from urllib.parse import urlparse, quote_plus, urlunparse

# Load environment variables
load_dotenv('backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

if not MONGO_URL or not DB_NAME:
    print("Error: MONGO_URL or DB_NAME not found in .env")
    exit(1)

def fix_mongo_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.username and parsed.password:
        escaped_user = quote_plus(parsed.username)
        escaped_pass = quote_plus(parsed.password)
        netloc = f"{escaped_user}:{escaped_pass}@{parsed.hostname}"
        if parsed.port:
            netloc += f":{parsed.port}"
        fixed_url = urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
        return fixed_url
    return url

fixed_url = fix_mongo_url(MONGO_URL)

try:
    client = MongoClient(
        fixed_url,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=5000
    )
    db = client[DB_NAME]
    
    # Collections to clear
    collections_to_clear = [
        'fee_configurations',
        'fee_payments',
        'student_fee_categories',
        'student_fees',
        'fee_heads',
        'fee_ledgers',
        'payments',
        'transactions'
    ]

    print("--- Clearing Fee Data ---")
    
    for col_name in collections_to_clear:
        if col_name in db.list_collection_names():
            count = db[col_name].count_documents({})
            if count > 0:
                result = db[col_name].delete_many({})
                print(f"Deleted {result.deleted_count} documents from '{col_name}'")
            else:
                print(f"Collection '{col_name}' is already empty.")
        else:
            print(f"Collection '{col_name}' does not exist.")

    # Update students collection to remove fee references
    if 'students' in db.list_collection_names():
        print("--- Updating Students ---")
        result = db['students'].update_many(
            {}, 
            {
                '$unset': {
                    'fee_type_id': "",
                    'monthly_fee_config_id': "",
                    'fee_status': "",
                    'due_amount': "",
                    'last_payment_date': ""
                }
            }
        )
        print(f"Updated {result.modified_count} student records (unset fee fields).")

    print("\n✅ Fee data cleared successfully.")

except Exception as e:
    print(f"Error: {e}")
