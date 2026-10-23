"""Unified error handling: every failure uses the same ``{"error": ...}`` envelope.

Registered handlers:

- ``StarletteHTTPException``: business 4xx/404 raised by routers;
- ``RequestValidationError``: request bodies (400, never 422);
- ``ProfileError``: profile validation (400);
- SQLAlchemy connection errors: 503 ``service unavailable``;
- any other ``Exception``: logged, answered with a generic 500.

``UnhandledErrorMiddleware`` sits *inside* ``CORSMiddleware``. Starlette's own
500 handler lives on ``ServerErrorMiddleware``, outside CORS, so browser
clients cannot read those responses; catching here keeps the JSON envelope
readable and the ``Access-Control-Allow-Origin`` header present.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import (
    DisconnectionError,
    InterfaceError,
    OperationalError,
    TimeoutError as SATimeoutError,
)
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.services.profile import ProfileError

logger = logging.getLogger("pivott.api")

INTERNAL_ERROR_MESSAGE = "Internal Server Error"
SERVICE_UNAVAILABLE_MESSAGE = "service unavailable"

#: Connection-level failures, not query bugs: the client may retry.
DATABASE_UNAVAILABLE = (
    OperationalError,
    InterfaceError,
    DisconnectionError,
    SATimeoutError,
)


def error_response(
    status_code: int,
    message: str,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    """Build the one error shape the API exposes: ``{"error": "..."}``."""
    return JSONResponse({"error": message}, status_code=status_code, headers=headers)


async def http_error_handler(
    _request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("error") or detail.get("message") or str(detail)
    else:
        message = str(detail)
    # Keep protocol headers such as ``Allow`` (405) and ``WWW-Authenticate`` (401).
    return error_response(exc.status_code, message, headers=exc.headers)


async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    if not errors:
        return error_response(400, "Invalid request body")

    first = errors[0]
    error_type = first.get("type", "")
    location = ".".join(str(part) for part in first.get("loc", ()) if part != "body")

    if error_type == "json_invalid":
        return error_response(400, "Invalid request body: malformed JSON")
    if error_type == "model_attributes_type" and not location:
        return error_response(400, "Body must be a JSON object")
    if location:
        message = f"Invalid request: {location}: {first.get('msg', 'invalid value')}"
    else:
        message = f"Invalid request: {first.get('msg', 'invalid value')}"
    return error_response(400, message)


async def profile_error_handler(_request: Request, exc: ProfileError) -> JSONResponse:
    return error_response(400, str(exc))


async def database_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.warning(
        "Database unavailable: %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return error_response(503, SERVICE_UNAVAILABLE_MESSAGE)


async def unhandled_error_handler(request: Request, _exc: Exception) -> JSONResponse:
    """Backstop for exceptions raised outside ``UnhandledErrorMiddleware``."""
    logger.exception("Unhandled error: %s %s", request.method, request.url.path)
    return error_response(500, INTERNAL_ERROR_MESSAGE)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(ProfileError, profile_error_handler)
    for exception_type in DATABASE_UNAVAILABLE:
        app.add_exception_handler(exception_type, database_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)


class UnhandledErrorMiddleware:
    """Turn unhandled exceptions into the JSON envelope *inside* CORS.

    ``ServerErrorMiddleware`` (where Starlette registers the ``Exception``
    handler) sits outside ``CORSMiddleware``; a 500 produced there reaches the
    browser without ``Access-Control-Allow-Origin`` and ``fetch`` rejects it
    before the page can read ``{"error": ...}``.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def tracking_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, tracking_send)
        except Exception:
            logger.exception(
                "Unhandled error: %s %s",
                scope.get("method"),
                scope.get("path"),
            )
            if response_started:
                raise
            response = error_response(500, INTERNAL_ERROR_MESSAGE)
            await response(scope, receive, send)
