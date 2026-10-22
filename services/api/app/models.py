"""First tables (Sprint 0). Ids are ULIDs (26 chars) so records created offline on a device
never collide (development plan §4.3). Children never have accounts: they are learner
profiles owned by a family (concept report §4.2)."""

from datetime import datetime

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, Timestamped, utcnow

ULID = String(26)


class User(Timestamped, Base):
    """A grown-up account: parent, carer or teacher."""

    __tablename__ = "users"
    id: Mapped[str] = mapped_column(ULID, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))


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
    entity: Mapped[str] = mapped_column(String(16), doc="learner or family")
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
