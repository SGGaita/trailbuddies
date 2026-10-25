"""First tables (Sprint 0). Ids are ULIDs (26 chars) so records created offline on a device
never collide (development plan §4.3). Children never have accounts: they are learner
profiles owned by a family (concept report §4.2)."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, Timestamped, utcnow

ULID = String(26)


class User(Timestamped, Base):
    """A grown-up account: parent, carer or teacher."""

    __tablename__ = "users"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    google_sub: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, doc="Google account id once linked (ONB-03)"
    )


class Family(Timestamped, Base):
    __tablename__ = "families"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(
        String(2), doc="ISO 3166-1 alpha-2; sets privacy rules and 'my seasons'"
    )
    plan: Mapped[str] = mapped_column(String(32), default="free")
    settings: Mapped[dict] = mapped_column(
        JSON, default=dict, doc="goal, limit, bedtime, voice, voice_rate, sound (see schemas.FamilySettings)"
    )
    pin: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        doc="Parent-gate PIN as {salt, hash, iterations}, PBKDF2-SHA256 computed on the device. "
        "The PIN itself never reaches the server.",
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    cohorts: Mapped[list] = mapped_column(
        JSON, default=list, server_default="[]", doc="feature-flag groups, e.g. ['beta'] (OPS-06)"
    )
    active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=func.now(),
        doc="last time a grown-up opened the app (SAF-05 inactivity rule)",
    )
    retention_notice: Mapped[str | None] = mapped_column(
        String(8), nullable=True, doc="inactivity warning already sent: first (23 months) or final"
    )
    members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
    learners: Mapped[list["Learner"]] = relationship(back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base):
    """Links a grown-up to a family with a role: owner, parent, carer or viewer."""

    __tablename__ = "family_members"
    __table_args__ = (UniqueConstraint("family_id", "user_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    family: Mapped[Family] = relationship(back_populates="members")


class Learner(Timestamped, Base):
    """A learner profile. Only a first name or nickname and birth month/year are stored."""

    __tablename__ = "learners"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    birth_year: Mapped[int] = mapped_column(Integer)
    birth_month: Mapped[int] = mapped_column(Integer)
    avatar_color: Mapped[str] = mapped_column(String(16), default="leaf")
    buddy: Mapped[str | None] = mapped_column(String(16), nullable=True)
    outfit: Mapped[dict] = mapped_column(JSON, default=dict)
    interests: Mapped[list] = mapped_column(JSON, default=list, doc="subject or topic ids, e.g. ['animals']")
    placement: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        doc="starting unit per subject from the placement quiz, e.g. {'numbers': 'counting-6-10'}",
    )
    difficulty: Mapped[str] = mapped_column(String(8), default="auto")
    levels: Mapped[dict] = mapped_column(
        JSON, default=dict, doc="per-subject level lock (ADP-02), e.g. {'numbers': '1'}"
    )
    wish: Mapped[str | None] = mapped_column(
        String(32), nullable=True, doc="shop item the learner is saving for"
    )
    removing_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="removal asked for; deleted 7 days later (FAM-03)"
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    family: Mapped[Family] = relationship(back_populates="learners")


class Consent(Base):
    """Verifiable parental consent: which policy version, which permissions, when."""

    __tablename__ = "consents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    policy_version: Mapped[str] = mapped_column(String(32))
    scopes: Mapped[dict] = mapped_column(JSON, doc='e.g. {"progress": true, "voice": false, "photos": false}')
    method: Mapped[str] = mapped_column(
        String(32),
        default="checkbox",
        doc="how consent was given: checkbox now; a verified method before a US launch",
    )
    region: Mapped[str | None] = mapped_column(
        String(32), nullable=True, doc="privacy rules the consent was given under (ONB-05)"
    )
    status: Mapped[str] = mapped_column(
        String(12),
        default="approved",
        server_default="approved",
        doc="approved, or pending until a signed US form is reviewed (ONB-06b)",
    )
    evidence: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="signed form: parent's name, typed signature, relationship, date"
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    given_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Session(Base):
    """A signed-in device. The cookie holds a random token; only its SHA-256 is stored."""

    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    device_name: Mapped[str | None] = mapped_column(
        String(60), nullable=True, doc="browser and system only, e.g. 'Chrome on Android' (FAM-08)"
    )


class LoginToken(Base):
    """A single-use magic-link token (hash only), valid for a few minutes."""

    __tablename__ = "login_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class Event(Base):
    """Append-only progress events (development plan §4.3). `seq` is the server order and
    the sync cursor; `id` is the device's ULID, so re-sending an event is harmless."""

    __tablename__ = "events"
    seq: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    id: Mapped[str] = mapped_column(ULID, unique=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EditHistory(Base):
    """The version an edit replaced (or an older edit that lost), kept 30 days (OFF-05)."""

    __tablename__ = "edit_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    entity: Mapped[str] = mapped_column(String(16), doc="learner, family or lesson")
    entity_id: Mapped[str] = mapped_column(String(26), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    reason: Mapped[str] = mapped_column(
        String(16), doc="replaced: a newer edit won; lost: this older edit arrived late"
    )
    kept_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Invite(Base):
    """An email invitation for a second parent (equal access) or a carer (view progress only)."""

    __tablename__ = "invites"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[str] = mapped_column(String(16))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    invited_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MediaAsset(Base):
    """A grown-up's photo or voice clip for a custom lesson (BLD-15). The file itself is in
    object storage; this row says whose it is and whether the server has checked it."""

    __tablename__ = "media_assets"
    id: Mapped[str] = mapped_column(ULID, primary_key=True, doc="made on the device, so cards work offline")
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(8), doc="photo or voice")
    content_type: Mapped[str] = mapped_column(String(32))
    bytes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default="pending", doc="pending, ready or rejected")
    reject_code: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        doc="no lesson uses it any more; deleted from storage 30 days later (SAF-05)",
    )


class CustomLesson(Base):
    """A lesson a grown-up made in the Lesson Builder (BLD-01..09). Cards keep their ids for
    life so progress survives edits; the lesson's exercises are generated on the device."""

    __tablename__ = "custom_lessons"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(60))
    template: Mapped[str] = mapped_column(String(8))
    question: Mapped[str | None] = mapped_column(String(80), nullable=True)
    puzzle_card: Mapped[str | None] = mapped_column(String(26), nullable=True)
    cards: Mapped[list] = mapped_column(JSON, default=list)
    assigned: Mapped[list] = mapped_column(JSON, default=list, doc="learner ids")
    version: Mapped[int] = mapped_column(Integer, default=1)
    options: Mapped[dict] = mapped_column(
        JSON, default=dict, doc="lesson settings: band, activities, hints, games (BLD-06)"
    )
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FamilyDeletion(Base):
    """SAF-04: a request to delete the whole family. Confirmed from a link sent by email, then
    kept for a 7-day undo window before everything is deleted."""

    __tablename__ = "family_deletions"
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), primary_key=True)
    requested_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    purge_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)


class DataExport(Base):
    """SAF-03: a ZIP of everything held about a family, downloadable for 7 days."""

    __tablename__ = "data_exports"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    requested_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(12), default="ready", doc="ready or failed")
    bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class FeatureFlag(Base):
    """OPS-06: a feature that ships dark and is turned on for everyone, some cohorts or some families."""

    __tablename__ = "feature_flags"
    key: Mapped[str] = mapped_column(String(48), primary_key=True)
    description: Mapped[str] = mapped_column(String(200), default="")
    everyone: Mapped[bool] = mapped_column(Boolean, default=False)
    cohorts: Mapped[list] = mapped_column(JSON, default=list)
    families: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BetaCode(Base):
    """An invite code for the closed beta. Using it puts the family in the code's cohort."""

    __tablename__ = "beta_codes"
    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    cohort: Mapped[str] = mapped_column(String(32), default="beta")
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    uses: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(String(120), default="", doc="who it was for; no child data")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Feedback(Base):
    """Feedback from a grown-up (beta). Children's names are replaced before it is stored."""

    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(12), doc="idea, problem or praise")
    message: Mapped[str] = mapped_column(Text)
    screen: Mapped[str] = mapped_column(String(80), default="")
    version: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class ErrorReport(Base):
    """SAF-07 option 2: our own error log, instead of Sentry. Scrubbed, kept 30 days."""

    __tablename__ = "error_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(8), doc="web or api")
    release: Mapped[str] = mapped_column(String(32), default="")
    screen: Mapped[str] = mapped_column(String(80), default="")
    message: Mapped[str] = mapped_column(String(500))
    stack: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
