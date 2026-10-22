"""ULIDs, matching packages/sync: 48-bit time + 80 bits of randomness, Crockford base32."""

import secrets
import time

_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def ulid(ms: int | None = None) -> str:
    ms = int(time.time() * 1000) if ms is None else ms
    n = (ms << 80) | secrets.randbits(80)
    out = []
    for _ in range(26):
        out.append(_ALPHABET[n & 31])
        n >>= 5
    return "".join(reversed(out))


def is_ulid(value: str) -> bool:
    return len(value) == 26 and all(c in _ALPHABET for c in value.upper())
