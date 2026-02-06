"""
Rate limiting configuration using slowapi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address


def get_api_key_or_ip(request) -> str:
    """
    Get rate limit key from API key header or fall back to IP.

    This ensures rate limits are applied per API key when available,
    otherwise per IP address.
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Use a hash prefix to avoid exposing the key in logs
        return f"key:{api_key[:8]}"
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(key_func=get_api_key_or_ip)
