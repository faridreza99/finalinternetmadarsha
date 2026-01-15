import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\USER\\Downloads\\Project\\finalinternetmadarsha\\backend\\.env')

async def remove_duplicates():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("MONGO_URL not found")
            return

        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'school_db')]
        tenant_id = "mham5678"
        
        # Aggregation to find duplicates
        pipeline = [
            {"$match": {"tenant_id": tenant_id, "is_active": True}},
            {"$group": {
                "_id": "$id",
                "count": {"$sum": 1},
                "ids": {"$push": "$_id"}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        async for doc in db.students.aggregate(pipeline):
            print(f"Processing duplicates for ID: {doc['_id']}")
            ids_to_remove = doc['ids'][1:] # Keep the first one, remove the rest
            
            if ids_to_remove:
                result = await db.students.update_many(
                    {"_id": {"$in": ids_to_remove}},
                    {"$set": {"is_active": False, "deleted_reason": "duplicate_cleanup"}}
                )
                print(f"  Marked {result.modified_count} duplicates as inactive.")
                
        # Also fix the specific logic flaw: hard delete any that are duplicated even if inactive?
        # Actually, let's just make sure we are clean for the user.
        print("Duplicate cleanup complete.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(remove_duplicates())
