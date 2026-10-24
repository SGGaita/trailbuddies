"""Signed-in devices (FAM-08): Free 2, Family 6 at once. Signing in on one more still works;
the grown-up is then asked to sign out an old device from Settings. Device names keep only
the browser and system (\"Chrome on Android\"), mirroring packages/domain/src/devices.js."""

import re

DEVICE_LIMITS = {"free": 2, "family": 6}


def device_limit(plan: str) -> int:
    return DEVICE_LIMITS.get(plan, DEVICE_LIMITS["free"])


def device_name(ua: str | None) -> str:
    ua = ua or ""
    systems = [
        (r"Android", "Android"),
        (r"iPad", "iPad"),
        (r"iPhone", "iPhone"),
        (r"Windows", "Windows"),
        (r"Mac OS X|Macintosh", "Mac"),
        (r"CrOS", "Chromebook"),
        (r"Linux", "Linux"),
    ]
    browsers = [
        (r"Edg/", "Edge"),
        (r"SamsungBrowser", "Samsung Internet"),
        (r"Firefox/", "Firefox"),
        (r"Chrome/", "Chrome"),
        (r"Safari/", "Safari"),
    ]
    os = next(
        (name for pat, name in systems if re.search(pat, ua, re.I if name != "Linux" else 0)), "a device"
    )
    browser = next((name for pat, name in browsers if re.search(pat, ua)), "Browser")
    return f"{browser} on {os}"
