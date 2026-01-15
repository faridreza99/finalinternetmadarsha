import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\USER\\Downloads\\Project\\finalinternetmadarsha\\backend\\.env')

async def cleanup_data():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("MONGO_URL not found")
            return

        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'school_db')]
        
        tenant_id = "mham5678"
        
        # Check counts before
        total_before = await db.students.count_documents({"tenant_id": tenant_id})
        active_before = await db.students.count_documents({"tenant_id": tenant_id, "is_active": True})
        
        print(f"Before cleanup: Total={total_before}, Active={active_before}")
        
        # Delete inactive students (where is_active is not True)
        result = await db.students.delete_many({
            "tenant_id": tenant_id,
            "is_active": {"$ne": True}
        })
        
        print(f"Deleted {result.deleted_count} inactive/legacy student records.")
        
        # Check counts after
        total_after = await db.students.count_documents({"tenant_id": tenant_id})
        print(f"After cleanup: Total={total_after}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(cleanup_data())
