from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_repo_root = Path(__file__).resolve().parent.parent.parent
# .env.local must win over stale shell exports (e.g. placeholder NEXT_PUBLIC_SUPABASE_URL).
load_dotenv(_repo_root / ".env.local", override=True)
load_dotenv(_repo_root / ".env", override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    queue_api_internal_secret: str = ""
    avg_service_minutes: int = 2
    active_staff: int = 2

    @property
    def supabase_rest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"

    @property
    def supabase_auth_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


settings = Settings(
    supabase_url=__import__("os").environ.get("NEXT_PUBLIC_SUPABASE_URL", ""),
    supabase_anon_key=__import__("os").environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
    supabase_service_role_key=__import__("os").environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    queue_api_internal_secret=__import__("os").environ.get("QUEUE_API_INTERNAL_SECRET", ""),
)
