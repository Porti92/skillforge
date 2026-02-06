"""
Chat endpoint for spec generation with SSE streaming.
"""

import structlog
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.core.rate_limiter import limiter
from app.dependencies import AuthenticatedRequest
from app.models.requests import ChatRequest
from app.services.openai_service import get_openai_service
from app.services.prompt_service import get_prompt_service

logger = structlog.get_logger()
router = APIRouter()


@router.post("/chat")
@limiter.limit("10/minute;100/hour")
async def chat(
    request: Request,
    body: ChatRequest,
    api_key: AuthenticatedRequest,
) -> EventSourceResponse:
    """
    Generate or refine technical specifications.

    Streams the response using Server-Sent Events (SSE).

    Event types:
    - token: A chunk of generated text
    - delimiter: The ---SPEC_START--- marker
    - ping: Heartbeat to keep connection alive
    - done: Generation complete
    - error: An error occurred
    """

    async def generate():
        try:
            prompt_service = get_prompt_service()
            openai_service = get_openai_service()

            # Determine if this is an initial request or follow-up
            is_initial = not body.messages or len(body.messages) == 0

            # Determine base prompt slug
            base_slug = "spec-generation" if is_initial else "spec-generation-followup"

            # Build user prompt based on input type
            user_prompt = _build_user_prompt(body, is_initial)

            # Compose system prompt with authority boundaries
            system_prompt, contract_version = await prompt_service.compose_system_prompt(
                base_slug=base_slug,
                spec_mode=body.spec_mode,
                agent_id=body.target_agent,
                user_prompt=None,  # We pass user prompt separately to maintain boundaries
                current_spec=body.current_spec if not is_initial else None,
            )

            logger.info(
                "Starting chat completion",
                is_initial=is_initial,
                spec_mode=body.spec_mode,
                target_agent=body.target_agent,
                contract_version=contract_version,
            )

            # Convert messages to dict format
            messages_dict = None
            if body.messages:
                messages_dict = [
                    {"role": msg.role, "content": msg.content}
                    for msg in body.messages
                ]

            # Stream the response
            async for event in openai_service.stream_chat_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                messages=messages_dict,
            ):
                yield event

        except ValueError as e:
            logger.error("Validation error in chat", error=str(e))
            yield {"event": "error", "data": str(e)}
        except Exception as e:
            logger.error("Unexpected error in chat", error=str(e), exc_info=True)
            yield {"event": "error", "data": "An unexpected error occurred"}

    return EventSourceResponse(generate())


def _build_user_prompt(body: ChatRequest, is_initial: bool) -> str:
    """
    Build the user prompt based on the request type.

    Handles:
    - Initial request with structured answers from question flow
    - Initial request without structured answers
    - Follow-up requests for iteration
    """
    # Build context from product type and platform
    context_lines = []
    if body.product_type:
        context_lines.append(f"Product Type: {body.product_type}")
    if body.platform:
        context_lines.append(f"Platform: {body.platform}")
    context = f"\nContext:\n{chr(10).join(context_lines)}" if context_lines else ""

    # Case 1: User completed the interactive question flow
    if body.structured_answers and body.original_prompt:
        answers_text = "\n".join(
            f"- {answer.question_id}: {answer.answer}"
            for answer in body.structured_answers
        )

        return f"""The user has answered the clarifying questions through an interactive flow.
Generate the full 8-section technical prompt based on their original idea and these answers.

Original Product Idea:
{body.original_prompt}

User's Answers:
{answers_text}{context}

Now generate the complete technical prompt with all 8 sections."""

    # Case 2: Initial request - need to ask clarifying questions
    if is_initial:
        return f"""Transform this product idea into a comprehensive, AI-agent-ready prompt:{context}

Product Idea:
{body.prompt}

Remember: Start by asking 3-5 clarifying questions. Do NOT generate the full prompt yet."""

    # Case 3: Follow-up request for iteration
    has_full_spec = body.current_spec and "### 1. Project Overview" in body.current_spec
    action = (
        "Update the technical prompt based on this feedback."
        if has_full_spec
        else "The user has answered your questions. Now generate the full 8-section technical prompt."
    )

    return f"""User response: {body.prompt}

{action}"""
