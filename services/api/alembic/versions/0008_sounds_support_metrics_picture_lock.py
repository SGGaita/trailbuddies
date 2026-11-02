"""Sprint 8: letter-sound recordings, invitation log (cancelled, resent), picture passwords,
support messages, weekly product metrics and the email timestamps for badge notifications.

Everything is added; nothing existing changes. Families get an empty sound list.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-03 02:08:31.196901
"""

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weekly_metrics",
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("week_start"),
    )
    op.create_table(
        "support_tickets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ref", sa.String(length=12), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=True),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("topic", sa.String(length=16), nullable=False),
        sa.Column("subject", sa.String(length=120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("diagnostics", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=12), server_default="open", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ref"),
    )
    with op.batch_alter_table("support_tickets", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_support_tickets_created_at"), ["created_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_support_tickets_family_id"), ["family_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_support_tickets_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("families", schema=None) as batch_op:
        batch_op.add_column(sa.Column("sounds", sa.JSON(), server_default="{}", nullable=False))
        batch_op.add_column(sa.Column("badge_mail_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("digest_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("invites", schema=None) as batch_op:
        batch_op.add_column(sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("resent_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("picture_lock", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("picture_lock")

    with op.batch_alter_table("invites", schema=None) as batch_op:
        batch_op.drop_column("resent_at")
        batch_op.drop_column("cancelled_at")

    with op.batch_alter_table("families", schema=None) as batch_op:
        batch_op.drop_column("digest_at")
        batch_op.drop_column("badge_mail_at")
        batch_op.drop_column("sounds")

    with op.batch_alter_table("support_tickets", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_support_tickets_user_id"))
        batch_op.drop_index(batch_op.f("ix_support_tickets_family_id"))
        batch_op.drop_index(batch_op.f("ix_support_tickets_created_at"))

    op.drop_table("support_tickets")
    op.drop_table("weekly_metrics")
