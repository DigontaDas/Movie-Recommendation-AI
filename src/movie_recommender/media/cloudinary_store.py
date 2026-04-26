from __future__ import annotations

from cloudinary import config as cloudinary_config
from cloudinary import uploader

from movie_recommender.config import get_settings


class CloudinaryStore:
    def __init__(self) -> None:
        settings = get_settings()
        cloudinary_config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )

    def upload_profile_image(self, file_bytes: bytes, filename: str, folder: str) -> dict:
        result = uploader.upload(
            file_bytes,
            public_id=filename,
            folder=folder,
            overwrite=True,
            resource_type="image",
        )
        return {"url": result.get("secure_url"), "publicId": result.get("public_id")}

    def delete_asset(self, public_id: str | None) -> None:
        if public_id:
            uploader.destroy(public_id, invalidate=True, resource_type="image")
