import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\USER\\Downloads\\Project\\finalinternetmadarsha\\backend\\.env')

async def find_duplicates():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("MONGO_URL not found")
            return

        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'school_db')]
        tenant_id = "mham5678"
        
        pipeline = [
            {"$match": {"tenant_id": tenant_id, "is_active": True}},
            {"$group": {
                "_id": "$id",
                "count": {"$sum": 1},
                "names": {"$push": "$name"},
                "ids": {"$push": "$_id"}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        async for doc in db.students.aggregate(pipeline):
            print(f"Duplicate ID: {doc['_id']}")
            print(f"  Count: {doc['count']}")
            print(f"  Names: {doc['names']}")
            print(f"  ObjectIDs: {doc['ids']}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(find_duplicates())
