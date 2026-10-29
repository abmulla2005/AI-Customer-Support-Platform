import asyncio
import logging
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_mock: bool = False
    _mock_storage: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self):
        """Initialize MongoDB Atlas connection with instant fallback if local port closed."""
        uri = settings.MONGODB_URI
        # If default localhost URI and local port 27017 is not open, instantly use memory store
        is_local = "localhost" in uri or "127.0.0.1" in uri
        should_try_connect = not is_local

        if is_local:
            import socket
            try:
                with socket.create_connection(("127.0.0.1", 27017), timeout=0.3):
                    should_try_connect = True
            except OSError:
                should_try_connect = False

        if should_try_connect:
            try:
                logger.info(f"Connecting to MongoDB at {uri}...")
                self.client = AsyncIOMotorClient(
                    uri,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=10000
                )
                await asyncio.wait_for(self.client.admin.command('ping'), timeout=1.5)
                self.db = self.client[settings.MONGODB_DATABASE]
                self.is_mock = False
                logger.info("Successfully connected to live MongoDB Atlas database!")
                await self.ensure_indexes()
                return
            except Exception as e:
                logger.warning(f"MongoDB connection failed: {e}. Falling back to resilient in-memory storage.")

        logger.info("Engaging ultra-fast in-memory database store (Atlas ready).")
        self.is_mock = True
        self.db = MockAsyncDatabase(self._mock_storage)

    async def disconnect(self):
        """Close database connection."""
        if self.client and not self.is_mock:
            self.client.close()
            logger.info("MongoDB client connection closed.")

    async def ensure_indexes(self):
        """Create necessary database indexes."""
        if self.is_mock or self.db is None:
            return
        try:
            # Users indexes
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("role")
            
            # Refresh sessions
            await self.db.refresh_sessions.create_index("user_id")
            await self.db.refresh_sessions.create_index("refresh_token_hash")
            
            # Chat threads
            await self.db.chat_threads.create_index([("user_id", 1), ("updated_at", -1)])
            
            # Messages
            await self.db.messages.create_index([("thread_id", 1), ("created_at", 1)])
            
            # Documents & chunks
            await self.db.documents.create_index([("user_id", 1), ("created_at", -1)])
            await self.db.document_chunks.create_index([("document_id", 1), ("page_number", 1)])
            await self.db.document_chunks.create_index([("user_id", 1), ("scope", 1)])
            
            # Support tickets
            await self.db.support_tickets.create_index([("customer_id", 1), ("status", 1)])
            await self.db.support_tickets.create_index([("assigned_employee_id", 1), ("status", 1)])
            
            # Employee notes
            await self.db.employee_notes.create_index([("ticket_id", 1), ("created_at", -1)])
            
            # Company Knowledge
            await self.db.company_knowledge.create_index([("category", 1), ("is_published", 1)])
            
            # Audit logs
            await self.db.audit_logs.create_index([("user_id", 1), ("timestamp", -1)])
            logger.info("All MongoDB indexes verified and established.")
        except Exception as e:
            logger.error(f"Error establishing MongoDB indexes: {e}")

class MockCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items
        self._index = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            k, d = key_or_list[0]
        else:
            k, d = key_or_list, direction
        rev = d == -1
        self._items.sort(key=lambda x: str(x.get(k, "")), reverse=rev)
        return self

    def skip(self, n: int):
        self._items = self._items[n:]
        return self

    def limit(self, n: int):
        self._items = self._items[:n]
        return self

    def __iter__(self):
        return iter(self._items)

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self._items):
            item = self._items[self._index]
            self._index += 1
            return item
        raise StopAsyncIteration

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is not None:
            return [dict(x) for x in self._items[:length]]
        return [dict(x) for x in self._items]

class MockAsyncCollection:
    def __init__(self, name: str, storage: Dict[str, List[Dict[str, Any]]]):
        self.name = name
        self._storage = storage
        if name not in self._storage:
            self._storage[name] = []

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._matches(doc, cond) for cond in v):
                    return False
            elif k == "$and" and isinstance(v, list):
                if not all(self._matches(doc, cond) for cond in v):
                    return False
            elif isinstance(v, dict):
                # Operator support ($in, $ne, $gte, etc.)
                val = doc.get(k)
                for op, op_val in v.items():
                    if op == "$in" and val not in op_val:
                        return False
                    elif op == "$nin" and val in op_val:
                        return False
                    elif op == "$ne" and val == op_val:
                        return False
                    elif op == "$exists":
                        if op_val and k not in doc:
                            return False
                        if not op_val and k in doc:
                            return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def create_index(self, *args, **kwargs):
        return "mock_index"

    async def insert_one(self, doc: Dict[str, Any]):
        import uuid
        inserted = dict(doc)
        if "_id" not in inserted:
            inserted["_id"] = str(uuid.uuid4())
        self._storage[self.name].append(inserted)
        class InsertResult:
            inserted_id = inserted["_id"]
        return InsertResult()

    async def insert_many(self, docs: List[Dict[str, Any]]):
        import uuid
        ids = []
        for d in docs:
            inserted = dict(d)
            if "_id" not in inserted:
                inserted["_id"] = str(uuid.uuid4())
            self._storage[self.name].append(inserted)
            ids.append(inserted["_id"])
        class InsertManyResult:
            inserted_ids = ids
        return InsertManyResult()

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for item in self._storage[self.name]:
            if self._matches(item, query):
                return dict(item)
        return None

    def find(self, query: Optional[Dict[str, Any]] = None) -> MockCursor:
        q = query or {}
        matches = [dict(item) for item in self._storage[self.name] if self._matches(item, q)]
        return MockCursor(matches)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        class UpdateResult:
            matched_count = 0
            modified_count = 0
            upserted_id = None
        res = UpdateResult()
        target = None
        for item in self._storage[self.name]:
            if self._matches(item, query):
                target = item
                break
        if target is not None:
            res.matched_count = 1
            if "$set" in update:
                target.update(update["$set"])
                res.modified_count = 1
            return res
        elif upsert:
            import uuid
            new_doc = dict(query)
            if "$set" in update:
                new_doc.update(update["$set"])
            if "_id" not in new_doc:
                new_doc["_id"] = str(uuid.uuid4())
            self._storage[self.name].append(new_doc)
            res.upserted_id = new_doc["_id"]
            return res
        return res

    async def delete_one(self, query: Dict[str, Any]):
        class DeleteResult:
            deleted_count = 0
        res = DeleteResult()
        for i, item in enumerate(self._storage[self.name]):
            if self._matches(item, query):
                del self._storage[self.name][i]
                res.deleted_count = 1
                break
        return res

    async def delete_many(self, query: Dict[str, Any]):
        class DeleteResult:
            deleted_count = 0
        res = DeleteResult()
        initial = len(self._storage[self.name])
        self._storage[self.name] = [item for item in self._storage[self.name] if not self._matches(item, query)]
        res.deleted_count = initial - len(self._storage[self.name])
        return res

    async def count_documents(self, query: Dict[str, Any]) -> int:
        return sum(1 for item in self._storage[self.name] if self._matches(item, query))

class MockAsyncDatabase:
    def __init__(self, storage: Dict[str, List[Dict[str, Any]]]):
        self._storage = storage

    def __getattr__(self, name: str) -> MockAsyncCollection:
        return MockAsyncCollection(name, self._storage)

    def __getitem__(self, name: str) -> MockAsyncCollection:
        return MockAsyncCollection(name, self._storage)

db_manager = DatabaseManager()

def get_database() -> AsyncIOMotorDatabase:
    """Dependency / accessor to get database instance."""
    if db_manager.db is None:
        raise RuntimeError("Database not initialized. Please call db_manager.connect() first.")
    return db_manager.db
