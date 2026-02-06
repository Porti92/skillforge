"""
Application configuration and settings.
Loads environment variables and provides typed settings.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_name: str = "Spec Generator API"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    # OpenAI
    openai_api_key: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Security
    api_secret_key: str
    allowed_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_chat: str = "10/minute"
    rate_limit_questions: str = "20/minute"

    # Prompt settings
    prompt_cache_ttl_seconds: int = 300  # 5 minutes
    max_prompt_length: int = 10000

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
