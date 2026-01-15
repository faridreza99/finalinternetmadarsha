import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\USER\\Downloads\\Project\\finalinternetmadarsha\\backend\\.env')

async def check_ids():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("MONGO_URL not found")
            return

        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'school_db')]
        tenant_id = "mham5678"
        
        print("Checking student IDs...")
        async for student in db.students.find({"tenant_id": tenant_id}).limit(5):
            print(f"Name: {student.get('name')}")
            print(f"  _id: {student.get('_id')}")
            print(f"  id: {student.get('id')}") # The custom ID field
            print(f"  student_id: {student.get('student_id')}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_ids())
