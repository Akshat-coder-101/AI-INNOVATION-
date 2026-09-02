import os
import uuid
import logging
import httpx
from typing import Dict, Any, Optional
from ..config import settings

logger = logging.getLogger("sahayak.tts")

class TTSService:
    @classmethod
    def _get_media_storage_path(cls) -> str:
        # Resolve path relative to backend root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        media_dir = os.path.join(base_dir, settings.MEDIA_DIR)
        os.makedirs(media_dir, exist_ok=True)
        return media_dir

    @classmethod
    async def synthesize_speech(
        cls, 
        text: str, 
        language: str = "en", 
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes real MP3 speech using ElevenLabs API if key is available,
        saves to local static storage (and Supabase Storage if configured),
        or returns Web Speech API fallback metadata.
        """
        voice = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"
        
        if settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY.strip()) > 10:
            try:
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        url,
                        headers={
                            "xi-api-key": settings.ELEVENLABS_API_KEY,
                            "Content-Type": "application/json"
                        },
                        json={
                            "text": text,
                            "model_id": "eleven_multilingual_v2",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.75
                            }
                        }
                    )
                    if resp.status_code == 200 and resp.content:
                        audio_id = str(uuid.uuid4())
                        filename = f"{audio_id}.mp3"
                        media_folder = cls._get_media_storage_path()
                        file_path = os.path.join(media_folder, filename)
                        
                        with open(file_path, "wb") as f:
                            f.write(resp.content)

                        # Approximate duration (128kbps ~ 16KB/s)
                        est_duration = max(3.0, round(len(resp.content) / 16000, 2))
                        
                        logger.info(f"[TTSService] Generated ElevenLabs audio file: {filename} ({len(resp.content)} bytes)")
                        return {
                            "provider": "elevenlabs",
                            "success": True,
                            "audio_url": f"/media/{filename}",
                            "duration_seconds": est_duration,
                            "language": language,
                            "voice_id": voice
                        }
                    else:
                        logger.warning(f"[TTSService] ElevenLabs API error {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"[TTSService] ElevenLabs synthesis failed: {e}")

        # Browser Web Speech fallback
        words = len(text.split())
        est_words_duration = max(4.0, round(words / 2.2, 2))
        return {
            "provider": "browser_speech_synthesis",
            "success": True,
            "audio_url": None,
            "duration_seconds": est_words_duration,
            "language": language,
            "voice_name": "Google Speech " + ("Hindi" if language == "hi" else "English"),
            "text": text
        }

    @classmethod
    async def generate_speech(cls, text: str, language: str = "en", voice_id: Optional[str] = None) -> Dict[str, Any]:
        return await cls.synthesize_speech(text, language, voice_id)
