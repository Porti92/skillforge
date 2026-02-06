"""
Pytest configuration and fixtures.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app


@pytest.fixture
def settings():
    """Get test settings."""
    return Settings(
        openai_api_key="test-key",
        supabase_url="https://test.supabase.co",
        supabase_anon_key="test-anon-key",
        supabase_service_role_key="test-service-key",
        api_secret_key="test-api-key",
        environment="test",
        debug=True,
    )


@pytest.fixture
def client():
    """Get test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Get authentication headers."""
    return {"X-API-Key": "test-api-key"}
