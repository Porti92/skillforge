"""
Questions endpoint for generating clarifying questions.
"""

import structlog
from fastapi import APIRouter, Request

from app.core.rate_limiter import limiter
from app.dependencies import AuthenticatedRequest
from app.models.requests import QuestionsRequest
from app.models.responses import Question, QuestionsResponse
from app.services.openai_service import get_openai_service
from app.services.prompt_service import get_prompt_service

logger = structlog.get_logger()
router = APIRouter()

# Question set version - increment when question schema changes
QUESTION_SET_VERSION = 1


@router.post("/questions", response_model=QuestionsResponse)
@limiter.limit("20/minute;200/hour")
async def generate_questions(
    request: Request,
    body: QuestionsRequest,
    api_key: AuthenticatedRequest,
) -> QuestionsResponse:
    """
    Generate clarifying multiple-choice questions for a product idea.

    Returns 3-5 questions with options and recommended selections
    based on the spec mode (MVP vs production-ready).
    """
    try:
        prompt_service = get_prompt_service()
        openai_service = get_openai_service()

        # Compose system prompt for question generation
        system_prompt, contract_version = await prompt_service.compose_questions_prompt(
            spec_mode=body.spec_mode,
            agent_id=body.target_agent,
        )

        # Build user prompt with context
        user_prompt = _build_questions_user_prompt(body)

        logger.info(
            "Generating questions",
            spec_mode=body.spec_mode,
            target_agent=body.target_agent,
            contract_version=contract_version,
        )

        # Generate questions using OpenAI
        result = await openai_service.generate_questions(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        # Transform to response model
        questions = [
            Question(
                id=q["id"],
                question=q["question"],
                options=q["options"],
                recommended_index=q["recommendedIndex"],
                required=q.get("required", True),
            )
            for q in result.get("questions", [])
        ]

        # Ensure we have at least 3 questions
        if len(questions) < 3:
            logger.warning(
                "Insufficient questions generated",
                count=len(questions),
                expected_min=3,
            )
            # Add fallback questions if needed
            questions = _ensure_minimum_questions(questions, body.spec_mode)

        return QuestionsResponse(
            question_set_version=QUESTION_SET_VERSION,
            contract_version=contract_version,
            questions=questions[:5],  # Max 5 questions
        )

    except ValueError as e:
        logger.error("Validation error generating questions", error=str(e))
        raise
    except Exception as e:
        logger.error("Error generating questions", error=str(e), exc_info=True)
        # Return fallback questions on error
        return _get_fallback_questions(body.spec_mode)


def _build_questions_user_prompt(body: QuestionsRequest) -> str:
    """Build the user prompt for question generation."""
    context_lines = []
    if body.product_type:
        context_lines.append(f"Product Type: {body.product_type}")
    if body.platform:
        context_lines.append(f"Platform: {body.platform}")
    context = f"\nContext:\n{chr(10).join(context_lines)}" if context_lines else ""

    return f"""Generate clarifying questions for this product idea:{context}

Product Idea:
{body.prompt}

Generate 3-5 multiple-choice questions with 2-5 options each.
Return as JSON with this structure:
{{
  "questions": [
    {{
      "id": "unique_id",
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3"],
      "recommendedIndex": 0,
      "required": true
    }}
  ]
}}"""


def _ensure_minimum_questions(
    questions: list[Question], spec_mode: str
) -> list[Question]:
    """Ensure we have at least 3 questions by adding fallbacks."""
    fallback_questions = _get_fallback_question_list(spec_mode)

    existing_ids = {q.id for q in questions}
    for fallback in fallback_questions:
        if len(questions) >= 3:
            break
        if fallback.id not in existing_ids:
            questions.append(fallback)

    return questions


def _get_fallback_questions(spec_mode: str) -> QuestionsResponse:
    """Get fallback questions when generation fails."""
    return QuestionsResponse(
        question_set_version=QUESTION_SET_VERSION,
        contract_version=1,
        questions=_get_fallback_question_list(spec_mode),
    )


def _get_fallback_question_list(spec_mode: str) -> list[Question]:
    """Get a list of fallback questions."""
    is_mvp = spec_mode == "mvp"

    return [
        Question(
            id="platform",
            question="What platform are you building for?",
            options=["Web application", "Mobile app", "Desktop app", "All platforms"],
            recommended_index=0 if is_mvp else 3,
            required=True,
        ),
        Question(
            id="auth",
            question="What type of authentication do you need?",
            options=[
                "Social login (Google/Apple)",
                "Email/password",
                "Magic links",
                "No authentication needed",
            ],
            recommended_index=0 if is_mvp else 1,
            required=True,
        ),
        Question(
            id="database",
            question="What kind of data storage do you need?",
            options=[
                "Simple key-value storage",
                "SQL database (PostgreSQL)",
                "NoSQL database (MongoDB)",
                "Real-time database (Supabase/Firebase)",
            ],
            recommended_index=0 if is_mvp else 3,
            required=True,
        ),
    ]
