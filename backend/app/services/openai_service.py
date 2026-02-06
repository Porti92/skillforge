"""
OpenAI service for AI model interactions.

Handles streaming chat completions and structured outputs.
"""

import asyncio
import json
import re
from typing import AsyncGenerator, Dict, List, Optional

import structlog
from openai import AsyncOpenAI

from app.config import get_settings

logger = structlog.get_logger()

# Output contract validation patterns
SPEC_DELIMITER = "---SPEC_START---"
REQUIRED_SECTIONS = [
    "### 1. Project Overview",
    "### 2. Technical Stack",
    "### 3. Core Features & User Flows",
    "### 4. Data Models & Architecture",
    "### 5. UI/UX Specifications",
    "### 6. Security & Performance",
    "### 7. Implementation Roadmap",
    "### 8. AI Agent Instructions",
]


class OpenAIService:
    """Service for OpenAI API interactions."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"  # Using gpt-4o for production

    async def stream_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncGenerator[Dict[str, str], None]:
        """
        Stream a chat completion with typed SSE events.

        Event types:
        - token: A chunk of generated text
        - delimiter: The ---SPEC_START--- marker was detected
        - ping: Heartbeat to keep connection alive
        - done: Generation complete
        - error: An error occurred

        Args:
            system_prompt: The system prompt
            user_prompt: The user's current input
            messages: Optional conversation history

        Yields:
            Dict with 'event' and 'data' keys for SSE
        """
        # Build messages array
        api_messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided
        if messages:
            for msg in messages:
                api_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })

        # Add current user prompt
        api_messages.append({"role": "user", "content": user_prompt})

        # Track accumulated response for validation
        accumulated_text = ""
        delimiter_sent = False
        last_ping = asyncio.get_event_loop().time()
        ping_interval = 10  # seconds

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                stream=True,
                temperature=0.7,
                max_tokens=4096,
            )

            async for chunk in stream:
                current_time = asyncio.get_event_loop().time()

                # Send heartbeat if needed
                if current_time - last_ping >= ping_interval:
                    yield {"event": "ping", "data": ""}
                    last_ping = current_time

                # Extract content from chunk
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    accumulated_text += content

                    # Check for delimiter
                    if not delimiter_sent and SPEC_DELIMITER in accumulated_text:
                        # Split at delimiter and emit separately
                        parts = accumulated_text.split(SPEC_DELIMITER, 1)
                        if len(parts) == 2:
                            # Emit any remaining pre-delimiter text
                            pre_delimiter = parts[0].rstrip()
                            if pre_delimiter and not pre_delimiter.isspace():
                                # Already sent, skip
                                pass

                            # Emit delimiter event
                            yield {"event": "delimiter", "data": SPEC_DELIMITER}
                            delimiter_sent = True

                            # Emit post-delimiter content
                            post_delimiter = parts[1].lstrip()
                            if post_delimiter:
                                yield {"event": "token", "data": post_delimiter}

                            # Reset accumulated for tracking
                            accumulated_text = SPEC_DELIMITER + parts[1]
                            continue

                    # Regular token emission
                    yield {"event": "token", "data": content}

            # Validate output contract
            validation_result = self._validate_output(accumulated_text)
            if not validation_result["valid"]:
                logger.warning(
                    "Output validation failed",
                    issues=validation_result["issues"],
                )
                # Could trigger auto-repair here, but for now just log

            yield {"event": "done", "data": ""}

        except Exception as e:
            logger.error("OpenAI streaming error", error=str(e))
            yield {"event": "error", "data": str(e)}

    async def generate_questions(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> Dict:
        """
        Generate structured questions using OpenAI.

        Args:
            system_prompt: The system prompt for question generation
            user_prompt: The product idea description

        Returns:
            Dict with 'questions' array matching the expected schema
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            # Validate and normalize the response
            questions = result.get("questions", [])
            normalized_questions = []

            for i, q in enumerate(questions[:5]):  # Max 5 questions
                normalized_questions.append({
                    "id": q.get("id", f"q{i+1}"),
                    "question": q.get("question", ""),
                    "options": q.get("options", [])[:5],  # Max 5 options
                    "recommendedIndex": min(
                        q.get("recommendedIndex", 0),
                        len(q.get("options", [])) - 1,
                    ),
                    "required": q.get("required", True),
                })

            return {"questions": normalized_questions}

        except json.JSONDecodeError as e:
            logger.error("Failed to parse OpenAI JSON response", error=str(e))
            raise ValueError("Invalid JSON response from OpenAI")
        except Exception as e:
            logger.error("OpenAI question generation error", error=str(e))
            raise

    def _validate_output(self, text: str) -> Dict:
        """
        Validate that the output meets the output contract.

        Checks:
        - Delimiter exists
        - All 8 sections present (if full spec)
        - No HTML/JSX detected

        Returns:
            Dict with 'valid' bool and 'issues' list
        """
        issues = []

        # Check for delimiter
        if SPEC_DELIMITER not in text:
            issues.append("Missing ---SPEC_START--- delimiter")

        # Only check sections if this appears to be a full spec
        # (not just clarifying questions)
        if "### 1. Project Overview" in text or "### 2. Technical Stack" in text:
            for section in REQUIRED_SECTIONS:
                if section not in text:
                    issues.append(f"Missing section: {section}")

        # Check for HTML (basic detection)
        html_patterns = [
            r"<div[^>]*>",
            r"<span[^>]*>",
            r"<p[^>]*>",
            r"<button[^>]*>",
            r"className=",
            r"onClick=",
        ]
        for pattern in html_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                issues.append(f"HTML/JSX detected: {pattern}")
                break

        return {"valid": len(issues) == 0, "issues": issues}

    async def auto_repair_output(
        self,
        original_output: str,
        issues: List[str],
        system_prompt: str,
    ) -> AsyncGenerator[Dict[str, str], None]:
        """
        Attempt to repair output that failed validation.

        Only called once per request (no retry loops).

        Args:
            original_output: The failed output
            issues: List of validation issues
            system_prompt: Original system prompt

        Yields:
            SSE events for the repaired output
        """
        repair_prompt = f"""Your previous response violated the output contract.

Issues found:
{chr(10).join(f'- {issue}' for issue in issues)}

Fix the issues and return the FULL spec again. Ensure:
1. Include the ---SPEC_START--- delimiter
2. Include ALL 8 sections with exact headers
3. Use only Markdown (no HTML or JSX)

Previous output for reference:
{original_output[:2000]}...

Now output the corrected, complete specification."""

        async for event in self.stream_chat_completion(
            system_prompt=system_prompt,
            user_prompt=repair_prompt,
        ):
            yield event


# Singleton instance
_openai_service: Optional[OpenAIService] = None


def get_openai_service() -> OpenAIService:
    """Get the OpenAI service singleton."""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
