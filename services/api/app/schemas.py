"""Request and response shapes. Children's data is minimal by design: a first name or
nickname, birth month and year, and app choices (colour, buddy, interests, levels)."""

from datetime import UTC, date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

AvatarColor = Literal["coral", "sky", "leaf", "berry", "sun", "night"]
BuddyId = Literal["zip", "tumi", "jumbo", "kiki"]
Difficulty = Literal["auto", "1", "2", "3"]
Role = Literal["owner", "parent", "carer", "viewer"]
EventType = Literal[
    "lesson_completed", "item_answered", "treasure_earned", "treasure_spent", "badge_awarded", "game_finished"
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MagicLinkIn(Strict):
    email: EmailStr
    role: Literal["parent", "teacher"] | None = Field(
        default=None,
        description="ONB-13: 'teacher' sends them to teacher set-up, whichever browser opens the link",
    )


class VerifyIn(Strict):
    token: str = Field(min_length=20, max_length=100)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    google: bool = Field(default=False, description="a Google account is linked (ONB-03)")

    @classmethod
    def of(cls, u) -> "UserOut":
        return cls(id=u.id, email=u.email, name=u.name, google=bool(u.google_sub))


class MeIn(Strict):
    name: str = Field(min_length=1, max_length=120)


class Bedtime(Strict):
    on: bool = False
    start: str = Field(default="19:30", pattern=r"^\d{2}:\d{2}$")
    end: str = Field(default="06:30", pattern=r"^\d{2}:\d{2}$")


class Emails(Strict):
    """Emails to parents (PAR-07, BDG-06). Wish emails start with the wishes feature (S11)."""

    digest: bool = Field(default=True, description="weekly badge digest, Sunday evening")
    badges: bool = Field(default=False, description="an email when a child earns a badge")
    wishes: bool = Field(default=False, description="an email when a child asks for a wish")


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
    breaks: Literal[0, 10, 15, 20, 30] = Field(
        default=0, description="stretch break every N minutes of play; 0 = off (PAR-04)"
    )
    captions: bool = Field(default=True, description="show everything the buddy says (ACC-03)")
    calm: Literal["device", "on", "off"] = Field(
        default="device", description="reduced motion: follow the device, or always on/off (ACC-02)"
    )
    emails: Emails = Emails()


class Pin(Strict):
    """PBKDF2-SHA256 of the PIN, computed on the device."""

    salt: str = Field(min_length=16, max_length=64)
    hash: str = Field(min_length=32, max_length=128)
    iterations: int = Field(ge=100_000, le=2_000_000)


class FamilyIn(Strict):
    name: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=2, max_length=2)
    invite_code: str | None = Field(default=None, max_length=16)

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


class SignedForm(Strict):
    """ONB-06b: the signed consent form for US families (COPPA). Reviewed by a person."""

    parent_name: str = Field(min_length=3, max_length=120)
    signature: str = Field(min_length=3, max_length=120, description="the parent types their full name")
    relationship: Literal["parent", "guardian"]
    signed_on: date

    @model_validator(mode="after")
    def signature_matches(self):
        norm = lambda v: " ".join(v.lower().split())  # noqa: E731
        if norm(self.signature) != norm(self.parent_name):
            raise ValueError("the signature must be the parent's full name")
        return self


class ConsentIn(Strict):
    policy_version: str = Field(max_length=32)
    scopes: dict[str, bool]
    agreed: Literal[True]
    form: SignedForm | None = None


Picture = Literal["apple", "banana", "cat", "dog", "fish", "star", "sun", "moon", "flower"]


class PictureLock(Strict):
    """FAM-02: hashed on the device (PBKDF2, like the PIN); the hint is the first picture."""

    salt: str = Field(max_length=64)
    hash: str = Field(max_length=128)
    iterations: int = Field(ge=1000, le=1_000_000)
    hint: Picture


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
    levels: dict[str, Difficulty] = Field(
        default_factory=dict, max_length=12, description="per-subject level lock (ADP-02)"
    )
    wish: str | None = Field(default=None, max_length=32, description="shop item the learner is saving for")
    removing_at: datetime | None = Field(
        default=None, description="removal asked for (FAM-03); null undoes it"
    )
    picture_lock: PictureLock | None = None
    updated_at: datetime

    @field_validator("name")
    @classmethod
    def first_name_only(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("name is required")
        return v

    @field_validator("buddy", mode="before")
    @classmethod
    def renamed_buddy(cls, v):
        """Juma the elephant is now Jumbo (Sprint 9); apps from before the rename still send 'juma'."""
        return "jumbo" if v == "juma" else v

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
    number: int | None = Field(default=None, ge=0, le=20, description="how many, for counting (BLD-03)")

    _clean = field_validator("label", "group", "fact")(lambda v: _one_line(v))


class LessonOptions(Strict):
    """A grown-up's settings for a custom lesson (BLD-06)."""

    band: Literal["seedling", "sprout", "explorer", "voyager", "trailblazer"] | None = None
    activities: int | None = Field(default=None, ge=3, le=8)
    hints: Literal["full", "light", "none"] | None = None
    games: list[Literal["memory", "jigsaw"]] | None = Field(default=None, max_length=2)


class CustomLessonIn(Strict):
    title: str = Field(min_length=1, max_length=60)
    template: Template = "learn"
    question: str | None = Field(default=None, max_length=80)
    puzzle_card: str | None = Field(default=None, max_length=26)
    cards: list[CardIn] = Field(min_length=1, max_length=12)
    assigned: list[str] = Field(default_factory=list, max_length=6)
    version: int = Field(default=1, ge=1)
    options: LessonOptions = LessonOptions()
    updated_at: datetime

    _clean = field_validator("title", "question")(lambda v: _one_line(v))


class CodeIn(Strict):
    code: str = Field(min_length=4, max_length=16)


class FeedbackIn(Strict):
    kind: Literal["idea", "problem", "praise"]
    message: str = Field(min_length=3, max_length=1000)
    screen: str = Field(default="", max_length=80, pattern=r"^[a-z0-9/_\-\[\]]*$")
    version: str = Field(default="", max_length=32)


class ErrorIn(Strict):
    source: Literal["web"] = "web"
    release: str = Field(default="", max_length=32)
    screen: str = Field(default="", max_length=80)
    message: str = Field(min_length=1, max_length=2000)
    stack: str = Field(default="", max_length=8000)


class TokenIn(Strict):
    token: str = Field(min_length=10, max_length=128)


class SoundIn(Strict):
    media_id: str | None = _ulid(default=None)


class SupportIn(Strict):
    topic: Literal["start", "lessons", "rewards", "privacy", "billing", "offline", "other"] = "other"
    subject: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=4000)
    diagnostics: dict[str, str | int | list[str]] | None = Field(default=None, max_length=12)


ClassBand = Literal["seedling", "sprout", "explorer", "voyager"]
Scope = Literal["class", "all"]


class TeacherIn(Strict):
    school_name: str = Field(min_length=2, max_length=120)
    join_school: str | None = Field(default=None, description="an offered school id to join instead")
    separate: bool = Field(default=False, description="decline the offer: a school of my own")


class ClassIn(Strict):
    name: str = Field(min_length=1, max_length=60)
    year_group: str = Field(default="", max_length=30)
    band: ClassBand

    _clean = field_validator("name", "year_group")(lambda v: " ".join(v.split()))


class StudentIn(Strict):
    first_name: str = Field(min_length=1, max_length=40)
    initial: str | None = Field(default=None, min_length=1, max_length=1, pattern=r"^[A-Za-z]$")

    @field_validator("first_name")
    @classmethod
    def first_name_only(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v or " " in v:
            raise ValueError("first name only")
        return v

    @field_validator("initial")
    @classmethod
    def upper(cls, v):
        return v.upper() if v else v


class StudentsIn(Strict):
    students: list[StudentIn] = Field(min_length=1, max_length=40)


class StudentPatch(Strict):
    first_name: str | None = Field(default=None, min_length=1, max_length=40)
    initial: str | None = Field(default=None, max_length=1)
    new_pictures: bool = False
    help: Literal[False] | None = Field(
        default=None, description="false: the teacher answered 'Ask my teacher'"
    )


class SchoolConsentIn(Strict):
    name: str = Field(min_length=3, max_length=120)
    role: str = Field(min_length=2, max_length=60, description="e.g. head teacher, class teacher")
    agreed: Literal[True]


class LinkIn(Strict):
    code: str = Field(min_length=6, max_length=12)
    student_id: str = Field(min_length=26, max_length=26)
    learner_id: str = Field(min_length=26, max_length=26)
    scope: Scope = "class"


class ScopeIn(Strict):
    scope: Scope


class ClassEventsIn(Strict):
    events: list[EventIn] = Field(max_length=500)


# --- Sprint 10: groups, assignments, classroom devices ---------------------------------------


class GroupIn(Strict):
    """CLS-07: a group within a class."""

    name: str = Field(min_length=1, max_length=30)
    student_ids: list[str] = Field(default_factory=list, max_length=60)

    _clean = field_validator("name")(lambda v: " ".join(v.split()))


class GroupPatch(Strict):
    name: str | None = Field(default=None, min_length=1, max_length=30)
    student_ids: list[str] | None = Field(default=None, max_length=60)

    _clean = field_validator("name")(lambda v: v if v is None else " ".join(v.split()))


class TargetIn(Strict):
    type: Literal["class", "group", "students"]
    group_id: str | None = Field(default=None, max_length=26)
    student_ids: list[str] | None = Field(default=None, max_length=60)

    @model_validator(mode="after")
    def _complete(self):
        if self.type == "group" and not self.group_id:
            raise ValueError("pick a group")
        if self.type == "students" and not self.student_ids:
            raise ValueError("pick at least one child")
        if self.type != "group":
            self.group_id = None
        if self.type != "students":
            self.student_ids = None
        return self


class AssignmentIn(Strict):
    """ASN-01: a built-in unit or one of the teacher's own lessons, for the class, a group or
    chosen children, with an optional due date."""

    kind: Literal["unit", "custom"]
    unit_id: str | None = Field(default=None, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str | None = Field(default=None, min_length=1, max_length=80, description="the unit's title")
    lesson_id: str | None = Field(default=None, max_length=26)
    target: TargetIn
    due_on: date | None = None

    @model_validator(mode="after")
    def _what(self):
        if self.kind == "unit" and not (self.unit_id and self.title):
            raise ValueError("pick a unit")
        if self.kind == "custom" and not self.lesson_id:
            raise ValueError("pick a lesson")
        return self


class DeviceIn(Strict):
    """CRM-01: this device becomes a classroom device. The id is made on the device."""

    id: str = Field(min_length=26, max_length=26)
    label: str = Field(min_length=1, max_length=60)
