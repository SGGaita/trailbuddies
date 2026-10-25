"""Where grown-ups' photos and voice clips are kept (BLD-15). Two backends with one shape:

- ``S3Storage``: presigned PUT/GET against an S3-compatible bucket (Cloudflare R2 in
  production, MinIO locally). Files never pass through the API on the way in.
- ``LocalStorage``: files on this server's disk, uploaded and downloaded through the API
  with short-lived HMAC-signed URLs. Used by tests and a plain local run.

Objects are private. Every URL handed out expires after ``media_url_minutes``.
"""

import hashlib
import hmac
import time
from functools import lru_cache
from pathlib import Path

from .settings import Settings, get_settings


def _key(media_id: str) -> str:
    return f"media/{media_id}"


class LocalStorage:
    def __init__(self, s: Settings):
        if s.env == "production" and s.media_secret == "dev-only-media-secret":
            raise RuntimeError("TB_MEDIA_SECRET must be set in production")
        self.root = Path(s.media_dir)
        self.secret = s.media_secret.encode()
        self.base = s.media_url_base.rstrip("/")
        self.ttl = s.media_url_minutes * 60

    def sign(self, media_id: str, method: str, exp: int) -> str:
        msg = f"{method}:{media_id}:{exp}".encode()
        return hmac.new(self.secret, msg, hashlib.sha256).hexdigest()

    def check(self, media_id: str, method: str, exp: int, sig: str) -> bool:
        return exp >= time.time() and hmac.compare_digest(self.sign(media_id, method, exp), sig)

    def _url(self, media_id: str, method: str) -> str:
        exp = int(time.time()) + self.ttl
        return f"{self.base}/media/blob/{media_id}?exp={exp}&sig={self.sign(media_id, method, exp)}"

    def upload_url(self, media_id: str, content_type: str) -> str:
        return self._url(media_id, "PUT")

    def download_url(self, media_id: str) -> str:
        return self._url(media_id, "GET")

    def path(self, media_id: str) -> Path:
        return self.root / _key(media_id)

    def put(self, media_id: str, data: bytes) -> None:
        p = self.path(media_id)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get(self, media_id: str, limit: int) -> bytes | None:
        p = self.path(media_id)
        if not p.exists():
            return None
        with p.open("rb") as f:
            return f.read(limit + 1)

    def delete(self, media_id: str) -> None:
        self.path(media_id).unlink(missing_ok=True)

    # Content packs (CNT-02) live beside the media under packs/.
    def put_key(self, key: str, data: bytes, content_type: str = "application/json") -> None:
        p = self.root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get_key(self, key: str) -> bytes | None:
        p = self.root / key
        return p.read_bytes() if p.exists() else None

    def delete_key(self, key: str) -> None:
        (self.root / key).unlink(missing_ok=True)

    def key_download_url(self, key: str, filename: str) -> str | None:
        """None: the API streams the file itself (see routes/privacy.py)."""
        return None


class S3Storage:
    def __init__(self, s: Settings):
        import boto3
        from botocore.config import Config

        cfg = Config(signature_version="s3v4", s3={"addressing_style": "path"})
        common = {
            "region_name": s.s3_region,
            "aws_access_key_id": s.s3_access_key or None,
            "aws_secret_access_key": s.s3_secret_key or None,
            "config": cfg,
        }
        self.client = boto3.client("s3", endpoint_url=s.s3_endpoint or None, **common)
        # Presigned URLs must use the host the browser can reach.
        self.public = boto3.client("s3", endpoint_url=s.s3_public_endpoint or s.s3_endpoint or None, **common)
        self.bucket = s.s3_bucket
        self.ttl = s.media_url_minutes * 60
        self.ready = s.env == "production"  # production buckets are made by hand (R2)

    def _ensure_bucket(self) -> None:
        """Local MinIO: make the bucket the first time it's needed."""
        if self.ready:
            return
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:  # noqa: BLE001 - missing bucket or no permission to check
            self.client.create_bucket(Bucket=self.bucket)
        self.ready = True

    def upload_url(self, media_id: str, content_type: str) -> str:
        self._ensure_bucket()
        return self.public.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": _key(media_id), "ContentType": content_type},
            ExpiresIn=self.ttl,
        )

    def download_url(self, media_id: str) -> str:
        return self.public.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": _key(media_id)}, ExpiresIn=self.ttl
        )

    def get(self, media_id: str, limit: int) -> bytes | None:
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=_key(media_id), Range=f"bytes=0-{limit}")
        except self.client.exceptions.NoSuchKey:
            return None
        return obj["Body"].read()

    def delete(self, media_id: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=_key(media_id))

    def put_key(self, key: str, data: bytes, content_type: str = "application/json") -> None:
        self._ensure_bucket()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def delete_key(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def key_download_url(self, key: str, filename: str) -> str | None:
        return self.public.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=self.ttl,
        )

    def get_key(self, key: str) -> bytes | None:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except self.client.exceptions.NoSuchKey:
            return None


@lru_cache
def _storage_for(backend: str):
    s = get_settings()
    return S3Storage(s) if backend == "s3" else LocalStorage(s)


def get_storage():
    """FastAPI dependency (tests override it)."""
    return _storage_for(get_settings().media_backend)
