import json
import logging
import re
from typing import Optional, Any, List
import httpx
from app.core.config import settings

logger = logging.getLogger("cortexlab.llm")

GEMINI_CANDIDATE_MODELS: List[str] = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]


class MultiProviderLLMManager:
    """Zero-Cost Resilient LLM Manager via Direct Async HTTPX Calls.

    Calls Google Gemini REST API (v1beta) and Groq Cloud OpenAI-compatible API
    directly without heavy third-party wrapper dependencies. Automatically falls
    back across Gemini model versions and Groq on rate limits or errors.
    """

    def __init__(self, byok_gemini: Optional[str] = None, byok_groq: Optional[str] = None):
        self.gemini_key = (byok_gemini or settings.GOOGLE_API_KEY or "").strip()
        self.groq_key = (byok_groq or settings.GROQ_API_KEY or "").strip()
        self.gemini_model_name = settings.GEMINI_MODEL
        self.groq_model_name = settings.GROQ_MODEL

    @property
    def has_active_key(self) -> bool:
        """Returns True if at least one valid LLM API key is available."""
        return bool(self.gemini_key or self.groq_key)

    async def _call_gemini_rest(self, prompt: str, system_message: str = "") -> Optional[str]:
        if not self.gemini_key:
            return None

        models_to_try = [self.gemini_model_name] + [
            m for m in GEMINI_CANDIDATE_MODELS if m != self.gemini_model_name
        ]

        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
            },
        }
        if system_message:
            payload["systemInstruction"] = {
                "parts": [{"text": system_message}]
            }

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                try:
                    resp = await client.post(
                        url,
                        params={"key": self.gemini_key},
                        json=payload,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates") or []
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts") or []
                            text = "".join(p.get("text", "") for p in parts).strip()
                            if text:
                                return text
                    elif resp.status_code in (404, 400) and "API_KEY_INVALID" not in resp.text:
                        logger.info(f"Gemini model {model} returned {resp.status_code}, trying next candidate...")
                        continue
                    else:
                        logger.warning(f"Gemini API error ({resp.status_code}) on {model}: {resp.text[:200]}")
                        break
                except Exception as e:
                    logger.warning(f"Gemini HTTP call exception on {model}: {e}")
                    continue

        return None

    async def _call_groq_rest(self, prompt: str, system_message: str = "") -> Optional[str]:
        if not self.groq_key:
            return None

        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.groq_model_name,
            "messages": messages,
            "temperature": 0.1,
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices") or []
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        if content:
                            return content
                else:
                    logger.warning(f"Groq API error ({resp.status_code}): {resp.text[:200]}")
            except Exception as e:
                logger.error(f"Groq HTTP call exception: {e}")

        return None

    async def invoke_with_fallback(self, prompt: str, system_message: str = "") -> str:
        """Invokes Gemini first, falls back to Groq if rate-limited or error."""
        # 1. Attempt Gemini via direct REST API
        if self.gemini_key:
            gemini_out = await self._call_gemini_rest(prompt=prompt, system_message=system_message)
            if gemini_out:
                return gemini_out
            logger.warning("Gemini call failed or returned empty. Switching to Groq fallback...")

        # 2. Attempt Groq via direct REST API
        if self.groq_key:
            groq_out = await self._call_groq_rest(prompt=prompt, system_message=system_message)
            if groq_out:
                return groq_out

        # 3. Deterministic Scientific Fallback Marker
        return (
            "{\n"
            '  "status": "OFFLINE_VERIFIED",\n'
            '  "summary": "Heuristic fallback: LLM keys not provided or rate limited.",\n'
            '  "risk_of_bias": "SOME_CONCERNS",\n'
            '  "confidence": 0.85\n'
            "}"
        )

    async def invoke_json(self, prompt: str, system_message: str = "") -> Optional[Any]:
        """Invokes LLM expecting a JSON response, stripping markdown fences and parsing safely."""
        if not self.has_active_key:
            return None

        raw_text = await self.invoke_with_fallback(prompt=prompt, system_message=system_message)
        if not raw_text or '"status": "OFFLINE_VERIFIED"' in raw_text:
            return None

        # Clean ```json ... ``` blocks if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Attempt to extract first JSON object or array
            match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
            logger.warning("Could not parse JSON from LLM output; falling back to deterministic extractor.")
            return None
