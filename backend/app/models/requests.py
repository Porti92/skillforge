"""
Pydantic request models for API endpoints.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.config import get_settings

# Valid agent IDs
VALID_AGENTS = {"v0", "bolt", "lovable", "claude-code", "cursor", "openai-codex"}

# Valid spec modes
VALID_SPEC_MODES = {"mvp", "production-ready"}


class Message(BaseModel):
    """Chat message in conversation history."""

    role: Literal["user", "assistant"]
    content: str


class StructuredAnswer(BaseModel):
    """A single answer to a clarifying question."""

    question_id: str = Field(..., description="ID of the question being answered")
    answer: str = Field(..., description="The selected answer")


class ChatRequest(BaseModel):
    """Request body for /api/v1/chat endpoint."""

    prompt: str = Field(..., description="User's current input")
    messages: List[Message] = Field(
        default_factory=list, description="Conversation history"
    )
    current_spec: Optional[str] = Field(
        None, alias="currentSpec", description="Existing spec content"
    )
    product_type: Optional[str] = Field(
        None, alias="productType", description="Type of product"
    )
    platform: Optional[str] = Field(None, description="Target platform")
    structured_answers: Optional[List[StructuredAnswer]] = Field(
        None, alias="structuredAnswers", description="Answers from question flow"
    )
    original_prompt: Optional[str] = Field(
        None, alias="originalPrompt", description="Original product idea"
    )
    spec_mode: str = Field(
        "mvp", alias="specMode", description="Specification mode (mvp or production-ready)"
    )
    target_agent: Optional[str] = Field(
        None, alias="targetAgent", description="Target AI coding agent"
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt_length(cls, v: str) -> str:
        """Ensure prompt doesn't exceed maximum length."""
        settings = get_settings()
        if len(v) > settings.max_prompt_length:
            raise ValueError(
                f"Prompt exceeds maximum length of {settings.max_prompt_length} characters"
            )
        return v

    @field_validator("spec_mode")
    @classmethod
    def validate_spec_mode(cls, v: str) -> str:
        """Ensure spec mode is valid."""
        if v not in VALID_SPEC_MODES:
            raise ValueError(f"Invalid spec_mode. Must be one of: {VALID_SPEC_MODES}")
        return v

    @field_validator("target_agent")
    @classmethod
    def validate_target_agent(cls, v: Optional[str]) -> Optional[str]:
        """Ensure target agent is valid if provided."""
        if v is not None and v not in VALID_AGENTS:
            raise ValueError(f"Invalid target_agent. Must be one of: {VALID_AGENTS}")
        return v

    class Config:
        populate_by_name = True


class QuestionsRequest(BaseModel):
    """Request body for /api/v1/questions endpoint."""

    prompt: str = Field(..., description="Product idea description")
    product_type: Optional[str] = Field(
        None, alias="productType", description="Type of product"
    )
    platform: Optional[str] = Field(None, description="Target platform")
    spec_mode: str = Field(
        "mvp", alias="specMode", description="Specification mode"
    )
    target_agent: Optional[str] = Field(
        None, alias="targetAgent", description="Target AI coding agent"
    )

    @field_validator("prompt")
    @classmethod
    def validate_prompt_length(cls, v: str) -> str:
        """Ensure prompt doesn't exceed maximum length."""
        settings = get_settings()
        if len(v) > settings.max_prompt_length:
            raise ValueError(
                f"Prompt exceeds maximum length of {settings.max_prompt_length} characters"
            )
        return v

    @field_validator("spec_mode")
    @classmethod
    def validate_spec_mode(cls, v: str) -> str:
        """Ensure spec mode is valid."""
        if v not in VALID_SPEC_MODES:
            raise ValueError(f"Invalid spec_mode. Must be one of: {VALID_SPEC_MODES}")
        return v

    @field_validator("target_agent")
    @classmethod
    def validate_target_agent(cls, v: Optional[str]) -> Optional[str]:
        """Ensure target agent is valid if provided."""
        if v is not None and v not in VALID_AGENTS:
            raise ValueError(f"Invalid target_agent. Must be one of: {VALID_AGENTS}")
        return v

    class Config:
        populate_by_name = True
