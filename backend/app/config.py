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
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # TTS
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_DEFAULT_VOICE_ID: str = os.getenv("ELEVENLABS_DEFAULT_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    
    # STT
    WHISPER_API_KEY: str = os.getenv("WHISPER_API_KEY", "")
    
    # Avatar
    AVATAR_PROVIDER: str = os.getenv("AVATAR_PROVIDER", "did")
    DID_API_KEY: str = os.getenv("DID_API_KEY", "")
    HEYGEN_API_KEY: str = os.getenv("HEYGEN_API_KEY", "")
    AVATAR_DEFAULT_ID: str = os.getenv("AVATAR_DEFAULT_ID", "amy-j37u")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sahayak.db")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "lesson-media")
    
    # App & CORS
    NEXT_PUBLIC_APP_URL: str = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
    SUPPORTED_LANGUAGES: str = os.getenv("SUPPORTED_LANGUAGES", "en,hi,hinglish")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
