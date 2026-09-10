import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

# backend/app/static/uploads — served by the StaticFiles mount added in
# main.py at /static, so a saved file at .../static/uploads/foo.jpg is
# reachable at http://localhost:8000/static/uploads/foo.jpg.
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Matches the "JPG, PNG or WebP" copy already shown in the onboarding UI,
# plus gif since it's a harmless, common image type to allow.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

ALLOWED_MEDIA_CONTENT_TYPES = {
    **ALLOWED_CONTENT_TYPES,
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}

# Matches the "up to 20 MB" copy already shown in the onboarding UI.
MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024

# Hardcoded to match the frontend's hardcoded API_BASE_URL
# ('http://localhost:8000/api') in src/api/client.ts — both need to
# become env-driven together before this goes anywhere past local dev.
PUBLIC_BASE_URL = "http://localhost:8000"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a single image file and saves it to local disk, returning a
    permanent URL. This replaces `URL.createObjectURL(file)` on the
    frontend, which only ever produced a temporary blob: URL scoped to
    that browser tab — never a real, persistable, shareable file.
    """
    ext = ALLOWED_CONTENT_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, WebP, or GIF images are allowed.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be 20 MB or smaller.",
        )
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That file is empty.",
        )

    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"{PUBLIC_BASE_URL}/static/uploads/{filename}"}

@router.post("/media")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload authentic creator deliverable media (image or video)."""
    ext = ALLOWED_MEDIA_CONTENT_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, WebP, GIF, MP4, WebM, or MOV files are allowed.",
        )

    contents = await file.read()
    if len(contents) > MAX_MEDIA_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Media must be 100 MB or smaller.")
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That file is empty.")

    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(contents)

    return {
        "url": f"{PUBLIC_BASE_URL}/static/uploads/{filename}",
        "media_type": "video" if file.content_type.startswith("video/") else "image",
    }
