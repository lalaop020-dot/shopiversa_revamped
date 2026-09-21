"""Payment-proof screenshot storage on Cloudinary."""
import asyncio
import io
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.core.config import settings

MAX_PROOF_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ProofError(Exception):
    """A screenshot problem the seller should see (bad file, storage down...)."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)


def _looks_like_image(data: bytes) -> bool:
    """Check the real bytes, not just the client-declared content type."""
    return (
        data.startswith(b"\xff\xd8\xff")                                  # JPEG
        or data.startswith(b"\x89PNG\r\n\x1a\n")                          # PNG
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")                # WEBP
    )


async def upload_proof(file: Optional[UploadFile]) -> Optional[str]:
    """Validate and upload a screenshot; returns its Cloudinary https URL, or
    None if no file was sent. Raises ProofError on any problem so callers
    never create a transaction whose screenshot silently went missing."""
    if file is None or not file.filename:
        return None
    if not is_configured():
        raise ProofError("Screenshot uploads are not configured yet. Please contact support.")
    if file.content_type not in ALLOWED_TYPES:
        raise ProofError("Screenshot must be a JPG, PNG or WEBP image")

    data = await file.read(MAX_PROOF_BYTES + 1)
    if len(data) > MAX_PROOF_BYTES:
        raise ProofError("Screenshot is too large (max 5 MB)")
    if not data or not _looks_like_image(data):
        raise ProofError("File is not a valid image")

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    try:
        # The SDK is synchronous; keep it off the event loop.
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            io.BytesIO(data),
            folder=settings.CLOUDINARY_PROOF_FOLDER,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
        )
    except Exception as e:  # network / auth / quota
        print(f"Cloudinary upload failed: {type(e).__name__}: {e}")
        raise ProofError("Could not upload the screenshot. Please try again.")
    url = result.get("secure_url")
    if not url:
        raise ProofError("Could not upload the screenshot. Please try again.")
    return url

