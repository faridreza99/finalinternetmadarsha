import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\USER\\Downloads\\Project\\finalinternetmadarsha\\backend\\.env')

async def count_students():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("MONGO_URL not found")
            return

        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'school_db')]
        
        # Default tenant used in the app
        tenant_id = "mham5678" 
        
        # Count all students for this tenant
        total_count = await db.students.count_documents({"tenant_id": tenant_id})
        print(f"Total students for tenant {tenant_id}: {total_count}")
        
        # Count active
        active_count = await db.students.count_documents({"tenant_id": tenant_id, "is_active": True})
        print(f"Active students: {active_count}")
        
        # List a few to see if they look correct or if we are missing some
        print("\nSample students:")
        async for student in db.students.find({"tenant_id": tenant_id}).limit(5):
            print(f"- {student.get('name', 'Unknown')} (ID: {student.get('student_id')}, Class: {student.get('class_id')})")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(count_students())
