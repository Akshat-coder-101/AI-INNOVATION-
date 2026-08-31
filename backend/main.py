import sys
import os

# Ensure backend directory is in sys.path so 'app' can always be resolved
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import ingest, lesson, interact, assess, report, profile, learning_path

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    print("[Sahayak AI Teacher] Database initialized and models registered.")
    yield
    print("[Sahayak AI Teacher] Shutdown.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Human-Like AI Educator Platform for AI Innovation Hackathon 2026",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for hackathon demo & testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(ingest.router, prefix=settings.API_PREFIX)
app.include_router(lesson.router, prefix=settings.API_PREFIX)
app.include_router(interact.router, prefix=settings.API_PREFIX)
app.include_router(assess.router, prefix=settings.API_PREFIX)
app.include_router(report.router, prefix=settings.API_PREFIX)
app.include_router(profile.router, prefix=settings.API_PREFIX)
app.include_router(learning_path.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "state_machine": "understand -> plan -> explain -> demonstrate -> question -> evaluate -> adapt -> assess -> report"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "sahayak-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
