import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.database import create_db_and_tables
from app.routers import decisions, votes, users, leaderboard, about, comments

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This builds your database tables on Railway automatically
    create_db_and_tables()
    yield

app = FastAPI(
    title="Parallel API",
    version="1.0.0",
    lifespan=lifespan
)

# 1. CORS Configuration (Allows frontend to talk to backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows access from any device/phone
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. API Routes (Check these BEFORE checking for static files)
app.include_router(decisions.router, prefix="/api")
app.include_router(votes.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(about.router, prefix="/api")

# 3. Health Check (Moved from / to /api/status so it doesn't block the frontend)
@app.get("/api/status")
def status():
    return {"status": "online", "database": "connected"}

# 4. Static Files (The "Catch-All" - MUST BE LAST)
# This serves your React index.html to anyone visiting your URL
frontend_build_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_build_path):
    app.mount("/", StaticFiles(directory=frontend_build_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Railway provides the PORT variable; default to 8000 for local testing
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)