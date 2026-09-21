"""Image storage on Cloudinary: payment-proof screenshots and seller KYC."""
import asyncio
import io
from typing import Optional

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from fastapi import UploadFile

from app.core.config import settings

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ProofError(Exception):
    """An upload problem the user should see (bad file, storage down...)."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)


def _configure() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _looks_like_image(data: bytes) -> bool:
    """Check the real bytes, not just the client-declared content type."""
    return (
        data.startswith(b"\xff\xd8\xff")                                  # JPEG
        or data.startswith(b"\x89PNG\r\n\x1a\n")                          # PNG
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")                # WEBP
    )


async def upload_image(file: Optional[UploadFile], folder: str, *, private: bool = False):
    """Validate and upload an image. Returns (https_url, public_id), or None if
    no file was sent. Raises ProofError on any problem so callers never save a
    record whose image silently went missing.

    private=True stores it as an *authenticated* asset: the plain URL does not
    work, only a signed link from signed_url()."""
    if file is None or not file.filename:
        return None
    if not is_configured():
        raise ProofError("Image uploads are not configured yet. Please contact support.", 503)
    if file.content_type not in ALLOWED_TYPES:
        raise ProofError("Image must be a JPG, PNG or WEBP file")

    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise ProofError("Image is too large (max 5 MB)")
    if not data or not _looks_like_image(data):
        raise ProofError("File is not a valid image")

    _configure()
    options = dict(folder=folder, resource_type="image", unique_filename=True, overwrite=False)
    if private:
        options["type"] = "authenticated"
    try:
        # The SDK is synchronous; keep it off the event loop.
        result = await asyncio.to_thread(cloudinary.uploader.upload, io.BytesIO(data), **options)
    except Exception as e:  # network / auth / quota
        print(f"Cloudinary upload failed: {type(e).__name__}: {e}")
        raise ProofError("Could not upload the image. Please try again.", 502)
    url, public_id = result.get("secure_url"), result.get("public_id")
    if not url or not public_id:
        raise ProofError("Could not upload the image. Please try again.", 502)
    return url, public_id


async def upload_proof(file: Optional[UploadFile]) -> Optional[str]:
    """Payment-proof screenshot -> public https URL (or None if no file)."""
    uploaded = await upload_image(file, settings.CLOUDINARY_PROOF_FOLDER)
    return uploaded[0] if uploaded else None


def signed_url(public_id: Optional[str]) -> Optional[str]:
    """Signed https link to a private (authenticated) asset."""
    if not public_id or not is_configured():
        return None
    _configure()
    url, _ = cloudinary.utils.cloudinary_url(
        public_id, type="authenticated", resource_type="image", sign_url=True, secure=True,
    )
    return url


async def delete_images(public_ids: list, *, private: bool = False) -> None:
    """Best-effort cleanup of uploads whose database record was never saved."""
    if not public_ids or not is_configured():
        return
    _configure()
    for pid in public_ids:
        try:
            await asyncio.to_thread(
                cloudinary.uploader.destroy, pid,
                resource_type="image", type="authenticated" if private else "upload",
            )
        except Exception as e:
            print(f"Cloudinary cleanup failed for {pid}: {type(e).__name__}: {e}")
