
import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient
from urllib.parse import urlparse, quote_plus, urlunparse
import json

# Load environment variables
load_dotenv('backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

if not MONGO_URL or not DB_NAME:
    with open('backend/student_details.txt', 'w') as f:
        f.write("Error: MONGO_URL or DB_NAME not found in .env")
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
    student = db.students.find_one({"admission_no": admission_no})
    
    with open('backend/student_details.txt', 'w', encoding='utf-8') as f:
        if student:
            f.write(f"ID: {student.get('_id')}\n")
            f.write(f"Name: {student.get('name')}\n")
            f.write(f"Class ID: {student.get('class_id')}\n")
            f.write(f"Class: {student.get('class')}\n")
            f.write(f"Class Name: {student.get('class_name')}\n")
            f.write(f"Section ID: {student.get('section_id')}\n")
            f.write(f"Section Name: {student.get('section_name')}\n")
            f.write(f"Marhala ID: {student.get('marhala_id')}\n")
            
            class_id = student.get('class_id')
            if class_id:
                cls = db.classes.find_one({"id": class_id})
                if cls:
                    f.write(f"Linked Class Name (by id): {cls.get('name')}\n")
                else:
                    try:
                        from bson import ObjectId
                        cls = db.classes.find_one({"_id": ObjectId(class_id)})
                        if cls:
                            f.write(f"Linked Class Name (by _id): {cls.get('name')}\n")
                        else:
                            f.write("Linked Class NOT found.\n")
                    except:
                        f.write("Linked Class lookup failed.\n")
        else:
            f.write("Student not found.\n")

except Exception as e:
    with open('backend/student_details.txt', 'w') as f:
        f.write(f"Error: {e}")
