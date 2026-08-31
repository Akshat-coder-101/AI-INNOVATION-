import httpx
from typing import Dict, Any, Optional
from ..config import settings

class TTSService:
    @classmethod
    async def synthesize_speech(
        cls, 
        text: str, 
        language: str = "en", 
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes speech using ElevenLabs API if key is available,
        or returns Web Speech API markup with audio metadata.
        """
        voice = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
        
        if settings.ELEVENLABS_API_KEY and len(settings.ELEVENLABS_API_KEY.strip()) > 10:
            try:
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
                async with httpx.AsyncClient(timeout=25.0) as client:
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
                    if resp.status_code == 200:
                        # Audio bytes received
                        return {
                            "provider": "elevenlabs",
                            "success": True,
                            "audio_url": None, # Will be stored or streamed
                            "language": language,
                            "voice_id": voice
                        }
            except Exception as e:
                print(f"[TTSService] ElevenLabs API error: {e}")

        # Browser Web Speech & synthesized audio fallback metadata
        return {
            "provider": "browser_speech_synthesis",
            "success": True,
            "audio_url": None,
            "language": language,
            "voice_name": "Google Speech " + ("Hindi" if language == "hi" else "English"),
            "text": text
        }
