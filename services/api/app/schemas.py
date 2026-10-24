"""Request and response shapes. Children's data is minimal by design: a first name or
nickname, birth month and year, and app choices (colour, buddy, interests, levels)."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

AvatarColor = Literal["coral", "sky", "leaf", "berry", "sun", "night"]
BuddyId = Literal["zip", "tumi", "juma", "kiki"]
Difficulty = Literal["auto", "1", "2", "3"]
Role = Literal["owner", "parent", "carer", "viewer"]
EventType = Literal[
    "lesson_completed", "item_answered", "treasure_earned", "treasure_spent", "badge_awarded", "game_finished"
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MagicLinkIn(Strict):
    email: EmailStr


class VerifyIn(Strict):
    token: str = Field(min_length=20, max_length=100)


class UserOut(BaseModel):
    id: str
    email: str
    name: str


class MeIn(Strict):
    name: str = Field(min_length=1, max_length=120)


class Bedtime(Strict):
    on: bool = False
    start: str = Field(default="19:30", pattern=r"^\d{2}:\d{2}$")
    end: str = Field(default="06:30", pattern=r"^\d{2}:\d{2}$")


class FamilySettings(Strict):
    goal: int = Field(default=2, ge=1, le=5, description="lessons a day")
    limit: int = Field(default=20, ge=0, le=180, description="minutes a day; 0 = no limit")
    bedtime: Bedtime = Bedtime()
    voice: bool = True
    voice_rate: float = Field(default=1.0, ge=0.6, le=1.3)
    sound: bool = True
    treasure_cap: bool = Field(
        default=True, description="daily treasure cap on (100 a day by default); off = no cap"
    )


class Pin(Strict):
    """PBKDF2-SHA256 of the PIN, computed on the device."""

    salt: str = Field(min_length=16, max_length=64)
    hash: str = Field(min_length=32, max_length=128)
    iterations: int = Field(ge=100_000, le=2_000_000)


class FamilyIn(Strict):
    name: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=2, max_length=2)

    @field_validator("country")
    @classmethod
    def upper(cls, v: str) -> str:
        if not v.isalpha():
            raise ValueError("country must be an ISO 3166-1 alpha-2 code")
        return v.upper()


class FamilyPatch(Strict):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    country: str | None = Field(default=None, min_length=2, max_length=2)
    settings: FamilySettings | None = None
    pin: Pin | None = None
    clear_pin: bool = False
    updated_at: datetime = Field(description="device time of the edit; last edit wins")


class ConsentIn(Strict):
    policy_version: str = Field(max_length=32)
    scopes: dict[str, bool]
    agreed: Literal[True]


class LearnerIn(Strict):
    name: str = Field(min_length=1, max_length=40)
    birth_year: int = Field(ge=1900)
    birth_month: int = Field(ge=1, le=12)
    avatar_color: AvatarColor = "leaf"
    buddy: BuddyId | None = None
    outfit: dict[str, str] = Field(default_factory=dict, max_length=6)
    interests: list[str] = Field(default_factory=list, max_length=12)
    placement: dict[str, str] = Field(default_factory=dict, max_length=10)
    difficulty: Difficulty = "auto"
    wish: str | None = Field(default=None, max_length=32, description="shop item the learner is saving for")
    updated_at: datetime

    @field_validator("name")
    @classmethod
    def first_name_only(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("name is required")
        return v

    @field_validator("birth_year")
    @classmethod
    def not_future(cls, v: int) -> int:
        if v > datetime.now(UTC).year:
            raise ValueError("birth year is in the future")
        return v


class InviteIn(Strict):
    email: EmailStr
    role: Literal["parent", "viewer"] = Field(description="parent: equal access; viewer: view progress only")


class EventIn(Strict):
    id: str = Field(min_length=26, max_length=26)
    type: EventType
    learnerId: str = Field(min_length=26, max_length=26)  # noqa: N815 - matches the JS event shape
    at: datetime
    data: dict = Field(default_factory=dict)


class EventsIn(Strict):
    family_id: str
    events: list[EventIn] = Field(max_length=500)


MediaKind = Literal["photo", "voice"]
Template = Literal["learn", "sort", "puzzle"]
ULID_RE = r"^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$"


def _ulid(**kw):
    return Field(min_length=26, max_length=26, pattern=ULID_RE, **kw)


def _one_line(v: str | None) -> str | None:
    return " ".join(v.split()) if v is not None else None


class MediaIn(Strict):
    id: str = _ulid()
    kind: MediaKind
    content_type: str = Field(max_length=64)
    bytes: int = Field(gt=0)


class CardIn(Strict):
    """One card. Free text from a grown-up's screen, kept short and on one line."""

    id: str = Field(min_length=1, max_length=26, pattern=r"^[0-9A-Za-z_-]+$")
    label: str = Field(min_length=1, max_length=40)
    emoji: str | None = Field(default=None, max_length=16)
    photo: str | None = _ulid(default=None)
    voice: str | None = _ulid(default=None)
    group: str | None = Field(default=None, max_length=24)
    fact: str | None = Field(default=None, max_length=120)

    _clean = field_validator("label", "group", "fact")(lambda v: _one_line(v))


class CustomLessonIn(Strict):
    title: str = Field(min_length=1, max_length=60)
    template: Template = "learn"
    question: str | None = Field(default=None, max_length=80)
    puzzle_card: str | None = Field(default=None, max_length=26)
    cards: list[CardIn] = Field(min_length=1, max_length=12)
    assigned: list[str] = Field(default_factory=list, max_length=6)
    version: int = Field(default=1, ge=1)
    updated_at: datetime

    _clean = field_validator("title", "question")(lambda v: _one_line(v))
