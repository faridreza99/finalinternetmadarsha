import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv
import certifi
from bson import ObjectId

# Load .env
load_dotenv()

async def get_student_fee_structure(db, tenant_id: str, student):
    semester_id = student.get('semester_id')
    marhala_id = student.get('marhala_id')
    department_id = student.get('department_id')
    class_id = student.get('class_id')
    
    fee_query = {
        "tenant_id": tenant_id,
        "is_active": {"$ne": False}
    }
    
    if semester_id:
        def not_set(field):
            return {"$or": [{field: {"$exists": False}}, {field: None}, {field: ""}]}

        fee_query["$or"] = [
            {"semester_id": semester_id},
            {"$and": [{"department_id": department_id}, not_set("semester_id")]},
            {"$and": [{"marhala_id": marhala_id}, not_set("department_id"), not_set("semester_id")]},
            {"$and": [not_set("marhala_id"), not_set("department_id"), not_set("semester_id")]}
        ]
    elif class_id:
        fee_query["$or"] = [
            {"class_id": class_id},
            {"class_id": {"$in": [None, ""]}}
        ]
    
    fee_types = await db.fee_types.find(fee_query).to_list(100)
    
    result = {
        "fee_types": [],
        "monthly_total": 0,
    }
    
    for ft in fee_types:
        fee_info = {
            "name": ft.get('name', ''),
            "amount": ft.get('amount', 0),
            "frequency": ft.get('frequency', 'monthly'),
        }
        result["fee_types"].append(fee_info)
        
        if fee_info['frequency'] == 'monthly':
            result["monthly_total"] += fee_info['amount']
            
    return result

async def run_test():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'schoolerpdb')
    
    client = motor.motor_asyncio.AsyncIOMotorClient(
        mongo_url,
        tlsCAFile=certifi.where(),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[db_name]
    
    student = await db.students.find_one({"admission_no": "STU260002"})
    tenant_id = student['tenant_id']
    
    structure = await get_student_fee_structure(db, tenant_id, student)
    print(f"Fee Structure Result: {structure}")

if __name__ == "__main__":
    asyncio.run(run_test())
