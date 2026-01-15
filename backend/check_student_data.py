
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
    
    admission_no = "STU260002"
    print(f"Searching for student with admission_no: {admission_no}")
    
    student = db.students.find_one({"admission_no": admission_no})
    
    if student:
        print("\nStudent Found:")
        print(f"ID: {student.get('_id')}")
        print(f"Name: {student.get('name')}")
        print(f"Class ID: {student.get('class_id')}")
        print(f"Class Field: {student.get('class')}")
        print(f"Class Name: {student.get('class_name')}")
        print(f"Section ID: {student.get('section_id')}")
        print(f"Section Name: {student.get('section_name')}")
        print(f"Marhala ID: {student.get('marhala_id')}")
        
        # Check actual class document
        class_id = student.get('class_id')
        if class_id:
            cls = db.classes.find_one({"id": class_id})
            if cls:
                print(f"Linked Class Found: {cls.get('name')}")
            else:
                print("Linked Class NOT Found by 'id'. Checking '_id'...")
                # Try finding by ObjectId if class_id is a string that looks like an ObjectId
                try:
                    from bson import ObjectId
                    cls = db.classes.find_one({"_id": ObjectId(class_id)})
                    if cls:
                         print(f"Linked Class Found by _id: {cls.get('name')}")
                    else:
                         print("Linked Class NOT Found by _id either.")
                except:
                    pass

    else:
        print("Student not found.")

except Exception as e:
    print(f"Error: {e}")
