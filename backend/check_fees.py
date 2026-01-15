import motor.motor_asyncio
import asyncio
import json
import os
from bson import ObjectId
from datetime import datetime
from dotenv import load_dotenv
import certifi

# Load .env
load_dotenv()

class MongoEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

async def check_data():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'schoolerpdb')
    
    client = motor.motor_asyncio.AsyncIOMotorClient(
        mongo_url,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[db_name]
    
    results = {}
    
    # 1. Check student
    student = await db.students.find_one({"admission_no": "STU260002"})
    results["student"] = student
    
    if student:
        tenant_id = student['tenant_id']
    else:
        tenant_id = "mham5678"

    # 2. Check all fee types
    results["fee_types"] = await db.fee_types.find({"tenant_id": tenant_id}).to_list(100)

    # 3. Check fee_configurations
    results["fee_configurations"] = await db.fee_configurations.find({"tenant_id": tenant_id}).to_list(100)

    # 4. Check student_fees
    results["student_fees"] = await db.student_fees.find({"tenant_id": tenant_id, "student_id": "STU260002"}).to_list(100)

    # 5. Check monthly_payments
    results["monthly_payments"] = await db.monthly_payments.find({"tenant_id": tenant_id, "$or": [{"student_id": "STU260002"}, {"admission_no": "STU260002"}]}).to_list(100)

    # Write to file
    with open("fees_debug.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False, cls=MongoEncoder)
    
    print("Done. Results saved to fees_debug.json")

if __name__ == "__main__":
    asyncio.run(check_data())
