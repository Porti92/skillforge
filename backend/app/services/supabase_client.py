"""
Supabase client singleton for database operations.
"""

from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from app.config import get_settings


class SupabaseClient:
    """
    Supabase client wrapper providing both anon and service role access.

    - anon_client: For RLS-protected operations (read prompts)
    - service_client: For admin operations (write prompts, bypass RLS)
    """

    _anon_client: Optional[Client] = None
    _service_client: Optional[Client] = None

    @classmethod
    def get_anon_client(cls) -> Client:
        """
        Get Supabase client with anon key (RLS enforced).
        Use for read operations on public/RLS-protected tables.
        """
        if cls._anon_client is None:
            settings = get_settings()
            cls._anon_client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key,
            )
        return cls._anon_client

    @classmethod
    def get_service_client(cls) -> Client:
        """
        Get Supabase client with service role key (bypasses RLS).
        Use for admin operations only.
        """
        if cls._service_client is None:
            settings = get_settings()
            cls._service_client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
        return cls._service_client


@lru_cache
def get_supabase() -> Client:
    """Get the default (anon) Supabase client."""
    return SupabaseClient.get_anon_client()


def get_supabase_admin() -> Client:
    """Get the admin (service role) Supabase client."""
    return SupabaseClient.get_service_client()
