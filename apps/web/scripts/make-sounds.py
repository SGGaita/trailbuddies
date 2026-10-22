"""Generate the lesson sound effects (public/sounds/*.wav).

Made from sine tones here, so there is no licence to track. Recorded sounds from the
voice packs (Sprint 6) can replace these files with the same names.
Run: python3 apps/web/scripts/make-sounds.py
"""

import math
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "public" / "sounds"


def tone(freq, dur, vol=0.35, attack=0.01, decay=None, slide=0.0):
    n = int(RATE * dur)
    decay = decay or dur
    out = []
    for i in range(n):
        t = i / RATE
        f = freq + slide * t / dur
        env = min(1.0, t / attack) * math.exp(-3.0 * t / decay)
        # a little second harmonic makes it sound like a soft bell
        s = math.sin(2 * math.pi * f * t) + 0.25 * math.sin(4 * math.pi * f * t)
        out.append(vol * env * s / 1.25)
    return out


def mix(*parts):
    """parts: (start_seconds, samples)"""
    end = max(int(start * RATE) + len(p) for start, p in parts)
    buf = [0.0] * end
    for start, p in parts:
        o = int(start * RATE)
        for i, v in enumerate(p):
            buf[o + i] += v
    return buf


def save(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32000)) for v in samples))


C6, E6, G6, C7 = 1046.5, 1318.5, 1568.0, 2093.0
save("right", mix((0, tone(C6, 0.25)), (0.09, tone(G6, 0.35))))
save("miss", mix((0, tone(330, 0.22, vol=0.25, slide=-80))))
save("done", mix((0, tone(C6, 0.3)), (0.12, tone(E6, 0.3)), (0.24, tone(G6, 0.3)), (0.36, tone(C7, 0.6))))
print("wrote", sorted(p.name for p in OUT.glob("*.wav")))
