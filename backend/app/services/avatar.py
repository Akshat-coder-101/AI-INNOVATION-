import httpx
from typing import Dict, Any, Optional
from ..config import settings

class AvatarService:
    @classmethod
    async def generate_avatar_video(
        cls, 
        script: str, 
        avatar_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls D-ID or HeyGen if API keys are configured,
        otherwise returns structured interactive avatar configuration.
        """
        # 1. D-ID API
        if settings.DID_API_KEY and len(settings.DID_API_KEY.strip()) > 10 and settings.AVATAR_PROVIDER == "did":
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(
                        "https://api.d-id.com/talks",
                        headers={
                            "Authorization": f"Basic {settings.DID_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "script": {
                                "type": "text",
                                "input": script,
                                "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"}
                            },
                            "config": {"fluent": True, "pad_audio": 0.0}
                        }
                    )
                    if resp.status_code in [200, 201]:
                        data = resp.json()
                        return {
                            "provider": "did",
                            "talk_id": data.get("id"),
                            "status": data.get("status", "created"),
                            "video_url": data.get("result_url")
                        }
            except Exception as e:
                print(f"[AvatarService] D-ID failed: {e}")

        # 2. HeyGen API
        if settings.HEYGEN_API_KEY and len(settings.HEYGEN_API_KEY.strip()) > 10:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(
                        "https://api.heygen.com/v2/video/generate",
                        headers={
                            "X-Api-Key": settings.HEYGEN_API_KEY,
                            "Content-Type": "application/json"
                        },
                        json={
                            "video_inputs": [{
                                "character": {"type": "avatar", "avatar_id": avatar_id or settings.AVATAR_DEFAULT_ID},
                                "voice": {"type": "text", "input_text": script}
                            }]
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return {
                            "provider": "heygen",
                            "video_id": data.get("data", {}).get("video_id"),
                            "status": "processing"
                        }
            except Exception as e:
                print(f"[AvatarService] HeyGen failed: {e}")

        # 3. Dynamic Animated Talking AI Teacher Fallback (Graceful Degradation per PRD §9)
        return {
            "provider": "interactive_canvas_avatar",
            "avatar_name": "Prof. Sahayak AI",
            "avatar_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop",
            "status": "ready",
            "video_url": None,
            "is_animated_canvas": True
        }
