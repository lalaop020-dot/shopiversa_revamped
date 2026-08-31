from fastapi.responses import JSONResponse
from typing import Any


def ok(data: Any, status_code: int = 200) -> JSONResponse:
    """Standard success response: {success: true, data: ...}"""
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "data": data},
    )


def err(message: str, status_code: int = 400, **extra: Any) -> JSONResponse:
    content = {"success": False, "message": message}
    content.update(extra)
    return JSONResponse(
        status_code=status_code,
        content=content,
    )
