import sys
import os
import logging

# Ensure backend directory is in sys.path so 'app' can always be resolved
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import ingest, lesson, interact, assess, report, profile, learning_path, media, sandbox, health

logger = logging.getLogger("sahayak.main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    
    # Ensure generated media directory exists
    media_dir = os.path.join(backend_dir, settings.MEDIA_DIR)
    os.makedirs(media_dir, exist_ok=True)
    
    # Startup Provider Diagnostic Report
    print("=" * 65)
    print(f"🚀  {settings.PROJECT_NAME} v{settings.VERSION} — Provider Diagnostics")
    print("=" * 65)
    print(f"  • LLM Providers:      {'✅ Gemini (' + settings.GEMINI_MODEL + ')' if settings.GEMINI_API_KEY else '⚠️ Gemini missing'}")
    print(f"                        {'✅ Groq (' + settings.GROQ_MODEL + ')' if settings.GROQ_API_KEY else '⚠️ Groq missing'}")
    print(f"                        {'✅ Anthropic (' + settings.ANTHROPIC_MODEL + ')' if settings.ANTHROPIC_API_KEY else '⚠️ Anthropic missing'}")
    print(f"                        Order: {settings.LLM_PROVIDER_ORDER}")
    print(f"  • Embedding Provider: {settings.EMBEDDING_PROVIDER.upper()} ({'✅ Active' if settings.GEMINI_API_KEY else '⚠️ SHA-256 fallback'})")
    print(f"  • TTS Voice Engine:   {'✅ ElevenLabs (' + settings.ELEVENLABS_DEFAULT_VOICE_ID + ')' if settings.ELEVENLABS_API_KEY else '⚠️ Browser Web Speech Fallback'}")
    print(f"  • STT Voice Input:    {'✅ Deepgram Nova-2' if settings.DEEPGRAM_API_KEY else '⚠️ Browser STT Fallback'}")
    print(f"  • Avatar Provider:    {settings.AVATAR_PROVIDER.upper()} ({'✅ Colossyan API' if settings.COLOSSYAN_API_KEY else '✅ Interactive Canvas Fallback'})")
    print(f"  • Vector DB:          {'✅ Pinecone (' + settings.PINECONE_INDEX + ')' if settings.PINECONE_API_KEY else '✅ SQLite Local Hybrid'}")
    print(f"  • Database:           {settings.DATABASE_URL}")
    print("=" * 65)
    yield
    print(f"[{settings.PROJECT_NAME}] Shutdown completed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Human-Like AI Educator Platform for AI Innovation Hackathon 2026",
    lifespan=lifespan
)

# CORS Configuration with explicit allowed origins (F3)
cors_origins = list(set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    settings.NEXT_PUBLIC_APP_URL.rstrip("/")
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media static directory for serving synthesized audio & assets
media_storage_path = os.path.join(backend_dir, settings.MEDIA_DIR)
os.makedirs(media_storage_path, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_storage_path), name="media")

# Register API Routers (with /api prefix and root aliases)
for router_module in [ingest, lesson, interact, assess, report, profile, learning_path, media, sandbox, health]:
    app.include_router(router_module.router, prefix=settings.API_PREFIX)
    app.include_router(router_module.router)

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
@app.get("/api/health")
def health_status():
    return {"status": "healthy", "service": "sahayak-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
