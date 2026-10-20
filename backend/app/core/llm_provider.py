import json
import logging
import re
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("cortexlab.llm")


class MultiProviderLLMManager:
    """Zero-Cost Resilient LLM Manager.

    Automatically switches between Google Gemini Free Tier and Groq Cloud Free
    Tier on rate limits (HTTP 429) or timeouts, supporting BYOK (Bring Your Own Key).
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

    def get_llm(self, preferred_provider: str = "gemini") -> Any:
        """Instantiates the best available LLM client."""
        if preferred_provider == "gemini" and self.gemini_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model=self.gemini_model_name,
                    google_api_key=self.gemini_key,
                    temperature=0.1,
                    convert_system_message_to_human=True,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini, falling back to Groq: {e}")

        if self.groq_key:
            try:
                from langchain_community.chat_models import ChatGroq
                return ChatGroq(
                    groq_api_key=self.groq_key,
                    model_name=self.groq_model_name,
                    temperature=0.1,
                )
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

        logger.info("No API keys configured for Gemini or Groq. Operating in heuristic scientific extraction mode.")
        return None

    async def invoke_with_fallback(self, prompt: str, system_message: str = "") -> str:
        """Invokes Gemini first, falls back to Groq if rate-limited or error."""
        # 1. Attempt Gemini
        if self.gemini_key:
            try:
                llm = self.get_llm(preferred_provider="gemini")
                if llm:
                    messages = []
                    if system_message:
                        messages.append(("system", system_message))
                    messages.append(("human", prompt))
                    response = await llm.ainvoke(messages)
                    return str(response.content)
            except Exception as e:
                logger.warning(f"Gemini call failed or hit rate limit: {e}. Switching to Groq fallback...")

        # 2. Attempt Groq
        if self.groq_key:
            try:
                llm = self.get_llm(preferred_provider="groq")
                if llm:
                    messages = []
                    if system_message:
                        messages.append(("system", system_message))
                    messages.append(("human", prompt))
                    response = await llm.ainvoke(messages)
                    return str(response.content)
            except Exception as e:
                logger.error(f"Groq fallback failed as well: {e}")

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
