"""Sprint 11 (part 2): share codes, reports, the image check and the moderation queue.

Adds four tables and nullable columns only (no data changes), so the running API keeps
working while it runs: shares, share_reports, moderation_items, moderation_actions;
media_assets.origin_id and .scan, custom_lessons/custom_badges.source_share and
users.share_banned_at.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-21 19:09:36.225832
"""

import sqlalchemy as sa

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("item_id", sa.String(length=26), nullable=True),
        sa.Column("action", sa.String(length=24), nullable=False),
        sa.Column("target", sa.String(length=40), nullable=False),
        sa.Column("who", sa.String(length=320), nullable=False),
        sa.Column("why", sa.String(length=300), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("moderation_actions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_moderation_actions_at"), ["at"], unique=False)
        batch_op.create_index(batch_op.f("ix_moderation_actions_item_id"), ["item_id"], unique=False)

    op.create_table(
        "shares",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=True),
        sa.Column("class_id", sa.String(length=26), nullable=True),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("title", sa.String(length=60), nullable=False),
        sa.Column("package", sa.JSON(), nullable=False),
        sa.Column("media", sa.JSON(), nullable=False),
        sa.Column("checklist", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("created_by", sa.String(length=26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("imports", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint("(family_id IS NULL) <> (class_id IS NULL)", name="ck_shares_one_owner"),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("shares", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_shares_class_id"), ["class_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_shares_code"), ["code"], unique=True)
        batch_op.create_index(batch_op.f("ix_shares_family_id"), ["family_id"], unique=False)

    op.create_table(
        "moderation_items",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("share_id", sa.String(length=26), nullable=True),
        sa.Column("media_id", sa.String(length=26), nullable=True),
        sa.Column("family_id", sa.String(length=26), nullable=True),
        sa.Column("reason", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=8), nullable=False),
        sa.Column("outcome", sa.String(length=24), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["share_id"], ["shares.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("moderation_items", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_moderation_items_family_id"), ["family_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_moderation_items_media_id"), ["media_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_moderation_items_share_id"), ["share_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_moderation_items_status"), ["status"], unique=False)

    op.create_table(
        "share_reports",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("share_id", sa.String(length=26), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("reason", sa.String(length=24), nullable=False),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["share_id"], ["shares.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("share_id", "family_id", name="uq_share_reports_family"),
    )
    with op.batch_alter_table("share_reports", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_share_reports_family_id"), ["family_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_share_reports_share_id"), ["share_id"], unique=False)

    with op.batch_alter_table("custom_badges", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source_share", sa.String(length=26), nullable=True))

    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source_share", sa.String(length=26), nullable=True))

    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.add_column(sa.Column("origin_id", sa.String(length=26), nullable=True))
        batch_op.add_column(sa.Column("scan", sa.JSON(), nullable=True))
        batch_op.create_index(batch_op.f("ix_media_assets_origin_id"), ["origin_id"], unique=False)

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("share_banned_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("share_banned_at")

    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_media_assets_origin_id"))
        batch_op.drop_column("scan")
        batch_op.drop_column("origin_id")

    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.drop_column("source_share")

    with op.batch_alter_table("custom_badges", schema=None) as batch_op:
        batch_op.drop_column("source_share")

    with op.batch_alter_table("share_reports", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_share_reports_share_id"))
        batch_op.drop_index(batch_op.f("ix_share_reports_family_id"))

    op.drop_table("share_reports")
    with op.batch_alter_table("moderation_items", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_moderation_items_status"))
        batch_op.drop_index(batch_op.f("ix_moderation_items_share_id"))
        batch_op.drop_index(batch_op.f("ix_moderation_items_media_id"))
        batch_op.drop_index(batch_op.f("ix_moderation_items_family_id"))

    op.drop_table("moderation_items")
    with op.batch_alter_table("shares", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_shares_family_id"))
        batch_op.drop_index(batch_op.f("ix_shares_code"))
        batch_op.drop_index(batch_op.f("ix_shares_class_id"))

    op.drop_table("shares")
    with op.batch_alter_table("moderation_actions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_moderation_actions_item_id"))
        batch_op.drop_index(batch_op.f("ix_moderation_actions_at"))

    op.drop_table("moderation_actions")
