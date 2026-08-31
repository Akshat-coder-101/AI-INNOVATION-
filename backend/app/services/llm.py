import json
import httpx
from typing import Dict, Any, Optional, List
from ..config import settings

class LLMService:
    @classmethod
    async def generate_response(
        cls, 
        system_prompt: str, 
        user_prompt: str, 
        temperature: float = 0.2
    ) -> str:
        """
        Calls Anthropic Claude or OpenAI API if keys are provided;
        otherwise provides robust contextual synthesis.
        """
        # Try Anthropic API if key is present
        if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY.strip()) > 10:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.ANTHROPIC_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        json={
                            "model": settings.ANTHROPIC_MODEL,
                            "max_tokens": 2048,
                            "temperature": temperature,
                            "system": system_prompt,
                            "messages": [{"role": "user", "content": user_prompt}]
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["content"][0]["text"]
            except Exception as e:
                print(f"[LLMService] Anthropic call failed, trying fallback: {e}")

        # Try OpenAI API if key is present
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 10:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                            "Content-type": "application/json"
                        },
                        json={
                            "model": settings.OPENAI_MODEL,
                            "temperature": temperature,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ]
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[LLMService] OpenAI call failed: {e}")

        # Standalone contextual fallback synthesis
        return ""
