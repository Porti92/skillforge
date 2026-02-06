"""
API v1 router aggregation.
"""

from fastapi import APIRouter

from app.api.v1 import chat, questions

router = APIRouter(prefix="/api/v1")

# Include endpoint routers
router.include_router(chat.router, tags=["Chat"])
router.include_router(questions.router, tags=["Questions"])
