import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Sahayak AI Teacher"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    BACKEND_PORT: int = 8000
    
    # LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
    LLM_PROVIDER_ORDER: str = os.getenv("LLM_PROVIDER_ORDER", "gemini,groq,anthropic")
    
    # Embedding / RAG
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "gemini")  # gemini | deterministic
    
    # TTS
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_DEFAULT_VOICE_ID: str = os.getenv("ELEVENLABS_DEFAULT_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    
    # STT
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    DEEPGRAM_MODEL: str = os.getenv("DEEPGRAM_MODEL", "nova-2")
    
    # Avatar
    AVATAR_PROVIDER: str = os.getenv("AVATAR_PROVIDER", "free_avatar")  # free_avatar | huggingface | colossyan | did | heygen
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")     # Free token from huggingface.co
    COLOSSYAN_API_KEY: str = os.getenv("COLOSSYAN_API_KEY", "")
    DID_API_KEY: str = os.getenv("DID_API_KEY", "")
    HEYGEN_API_KEY: str = os.getenv("HEYGEN_API_KEY", "")
    CRAFTSTORY_API_KEY: str = os.getenv("CRAFTSTORY_API_KEY", "")
    AVATAR_DEFAULT_ID: str = os.getenv("AVATAR_DEFAULT_ID", "amy-j37u")
    
    # Database & Vector DB
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sahayak.db")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "lesson-media")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX: str = os.getenv("PINECONE_INDEX", "ai-teacher-index")
    PINECONE_HOST: str = os.getenv("PINECONE_HOST", "")
    
    # Media & Storage
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", "generated_media")
    
    # App & CORS
    NEXT_PUBLIC_APP_URL: str = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
    SUPPORTED_LANGUAGES: str = os.getenv("SUPPORTED_LANGUAGES", "en,hi,hinglish")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

settings = Settings()
