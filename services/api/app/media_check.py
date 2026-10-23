"""Server-side checks on uploaded media (SAF-02). The device already strips metadata and
resizes photos; the server checks again and refuses anything that doesn't look right,
above all a photo that still carries GPS location data."""

import io

from PIL import Image, UnidentifiedImageError

GPS_IFD = 0x8825
IMAGE_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_SIDE = 2048


class Rejected(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def check_photo(data: bytes) -> str:
    """Returns the real content type, or raises Rejected."""
    try:
        img = Image.open(io.BytesIO(data))
        fmt = img.format
        exif = img.getexif()
        size = img.size
        img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError) as e:
        raise Rejected("bad_file", "That isn't a photo we can use.") from e
    if fmt not in IMAGE_FORMATS:
        raise Rejected("bad_file", "Photos must be JPEG, PNG or WebP.")
    if exif and exif.get_ifd(GPS_IFD):
        raise Rejected("gps_metadata", "The photo still has location data, so it wasn't saved.")
    if max(size) > MAX_SIDE:
        raise Rejected("too_big", "The photo is too large.")
    return IMAGE_FORMATS[fmt]


def check_voice(data: bytes) -> str:
    """Recognise the clip's container from its first bytes."""
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav"
    if data[:4] == b"\x1a\x45\xdf\xa3":
        return "audio/webm"
    if data[:4] == b"OggS":
        return "audio/ogg"
    if data[4:8] == b"ftyp":
        return "audio/mp4"
    raise Rejected("bad_file", "That isn't a voice clip we can play.")
