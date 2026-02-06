"""
FastAPI dependencies for dependency injection.
"""

from typing import Annotated

from fastapi import Depends

from app.core.security import verify_api_key

# Type alias for authenticated requests
AuthenticatedRequest = Annotated[str, Depends(verify_api_key)]
