"""Custom lessons and media assets (Sprint 5: Lesson Builder).

New tables only. Lesson ids, card ids and media ids are made on the device (ULIDs), so a
grown-up can build a lesson offline and it uploads later.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-23 03:14:55.602500
"""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_lessons",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("title", sa.String(length=60), nullable=False),
        sa.Column("template", sa.String(length=8), nullable=False),
        sa.Column("question", sa.String(length=80), nullable=True),
        sa.Column("puzzle_card", sa.String(length=26), nullable=True),
        sa.Column("cards", sa.JSON(), nullable=False),
        sa.Column("assigned", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.String(length=26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_custom_lessons_family_id"), ["family_id"], unique=False)

    op.create_table(
        "media_assets",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="pending"),
        sa.Column("reject_code", sa.String(length=24), nullable=True),
        sa.Column("created_by", sa.String(length=26), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_media_assets_family_id"), ["family_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_media_assets_family_id"))

    op.drop_table("media_assets")
    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_custom_lessons_family_id"))

    op.drop_table("custom_lessons")
