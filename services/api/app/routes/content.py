"""Published content for devices (CNT-02, OFF-02): the pack manifest and the packs. Content
isn't personal, so these need no sign-in; a pack's name carries its hash, so it never changes
and can be cached for a year."""

import json

from fastapi import APIRouter, Depends, HTTPException, Response

from ..packs import CHANNELS, PACK_NAME, manifest_key
from ..storage import get_storage

router = APIRouter()


@router.get("/content/manifest")
def manifest(channel: str = "production", storage=Depends(get_storage)) -> Response:
    if channel not in CHANNELS:
        raise HTTPException(422, "channel is production or preview")
    data = storage.get_key(manifest_key(channel))
    if data is None:  # nothing published yet: the built-in content is all there is
        data = json.dumps({"schema": "packs/1", "release": None, "channel": channel, "packs": []}).encode()
    return Response(data, media_type="application/json", headers={"Cache-Control": "no-cache"})


@router.get("/content/packs/{name}")
def pack(name: str, storage=Depends(get_storage)) -> Response:
    if not PACK_NAME.match(name):
        raise HTTPException(404, "Pack not found")
    data = storage.get_key(f"packs/{name}")
    if data is None:
        raise HTTPException(404, "Pack not found")
    return Response(
        data, media_type="application/json", headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )
