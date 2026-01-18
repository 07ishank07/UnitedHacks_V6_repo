from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from app.database import create_db_and_tables
from app.routers import decisions, votes, users, leaderboard, about, comments

# Lifecycle event to create DB on startup
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Parallel API",
    description="Decision-making social platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static files from frontend build directory if it exists
frontend_build_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_build_path):
    app.mount("/", StaticFiles(directory=frontend_build_path, html=True), name="static")

# Allow React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"], # Vite default + production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decisions.router, prefix="/api")
app.include_router(votes.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(about.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Parallel API is running", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    # Pull the port from Railway environment variables
    port = int(os.getenv("PORT", 8000))
    # You MUST use 0.0.0.0, not 127.0.0.1 for Railway to see it
    uvicorn.run(app, host="0.0.0.0", port=port)