"""
Security utilities for API key validation.
"""

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import get_settings

# API key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify the API key from the request header.

    Args:
        api_key: The API key from X-API-Key header

    Returns:
        The validated API key

    Raises:
        HTTPException: If API key is missing or invalid
    """
    settings = get_settings()

    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Provide X-API-Key header.",
        )

    if api_key != settings.api_secret_key:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key.",
        )

    return api_key
