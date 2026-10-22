"""First tables (Sprint 0). Ids are ULIDs (26 chars) so records created offline on a device
never collide (development plan §4.3). Children never have accounts: they are learner
profiles owned by a family (concept report §4.2)."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
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
    family: Mapped[Family] = relationship(back_populates="learners")


class Consent(Base):
    """Verifiable parental consent: which policy version, which permissions, when."""

    __tablename__ = "consents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_id: Mapped[str] = mapped_column(ForeignKey("families.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    policy_version: Mapped[str] = mapped_column(String(32))
    scopes: Mapped[dict] = mapped_column(JSON, doc='e.g. {"progress": true, "voice": false, "photos": false}')
    given_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
