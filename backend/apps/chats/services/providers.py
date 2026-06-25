from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from openai import OpenAI


class AIProviderError(Exception):
    pass


@dataclass(frozen=True)
class AIProviderConfig:
    name: str
    model: str
    api_key: str
    api_key_setting: str
    base_url: str = ""


def get_active_provider_name() -> str:
    provider = settings.AI_PROVIDER.lower().strip()
    if provider not in {"openai", "groq"}:
        raise AIProviderError("AI_PROVIDER must be either 'openai' or 'groq'.")
    return provider


def get_provider_config(provider: str | None = None) -> AIProviderConfig:
    provider_name = (provider or get_active_provider_name()).lower().strip()

    if provider_name == "openai":
        return AIProviderConfig(
            name="openai",
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            api_key_setting="OPENAI_API_KEY",
            base_url=settings.OPENAI_BASE_URL,
        )

    if provider_name == "groq":
        return AIProviderConfig(
            name="groq",
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            api_key_setting="GROQ_API_KEY",
            base_url=settings.GROQ_BASE_URL,
        )

    raise AIProviderError("Assistant run uses an unsupported provider.")


def get_active_provider_config() -> AIProviderConfig:
    return get_provider_config(get_active_provider_name())


def create_provider_client(config: AIProviderConfig) -> OpenAI:
    client_kwargs = {"api_key": config.api_key}
    if config.base_url:
        client_kwargs["base_url"] = config.base_url
    return OpenAI(**client_kwargs)
