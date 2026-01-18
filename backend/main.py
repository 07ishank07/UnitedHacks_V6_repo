from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager
from app.database import create_db_and_tables
from app.routers import decisions, votes, users, leaderboard, about, comments

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Parallel API",
    version="1.0.0",
    lifespan=lifespan
)

# 1. MIDDLEWARE (Always comes early)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. API ROUTERS (Must come BEFORE static files)
app.include_router(decisions.router, prefix="/api")
app.include_router(votes.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(about.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Parallel API is running", "version": "1.0.0"}

# 3. STATIC FILES (The "Catch-All" - Must be LAST)
# This serves the React app for any route that isn't caught by the API above
frontend_build_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_build_path):
    # This mounts the frontend to "/" and handles 404s by serving index.html (html=True)
    app.mount("/", StaticFiles(directory=frontend_build_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable provided by Railway
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)