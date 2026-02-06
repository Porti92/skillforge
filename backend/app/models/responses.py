"""
Pydantic response models for API endpoints.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class Question(BaseModel):
    """A single clarifying question with multiple choice options."""

    id: str = Field(..., description="Unique identifier for the question")
    question: str = Field(..., description="The question text")
    options: List[str] = Field(
        ..., min_length=2, max_length=5, description="Answer options"
    )
    recommended_index: int = Field(
        ..., alias="recommendedIndex", ge=0, description="Index of recommended option"
    )
    required: bool = Field(default=True, description="Whether the question is required")

    class Config:
        populate_by_name = True


class QuestionsResponse(BaseModel):
    """Response body for /api/v1/questions endpoint."""

    question_set_version: int = Field(
        ..., alias="questionSetVersion", description="Version of the question schema"
    )
    contract_version: int = Field(
        ..., alias="contractVersion", description="Prompt contract version"
    )
    questions: List[Question] = Field(
        ..., min_length=3, max_length=5, description="Generated questions"
    )

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """Response body for health check endpoint."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    environment: str = Field(..., description="Deployment environment")


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(
        None, alias="errorCode", description="Machine-readable error code"
    )

    class Config:
        populate_by_name = True
