"""Content admin (CMS-01…04): staff roles, the audit log, content versions and uploaded pictures.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-21 22:54:40.592511
"""

import sqlalchemy as sa

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_log",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("who", sa.String(length=320), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("target", sa.String(length=80), nullable=False),
        sa.Column("detail", sa.JSON(), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("admin_log", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_admin_log_action"), ["action"], unique=False)
        batch_op.create_index(batch_op.f("ix_admin_log_at"), ["at"], unique=False)

    op.create_table(
        "content_assets",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("approval", sa.String(length=16), nullable=False),
        sa.Column("scan", sa.JSON(), nullable=True),
        sa.Column("label", sa.String(length=80), nullable=True),
        sa.Column("uploaded_by", sa.String(length=320), nullable=False),
        sa.Column("approved_by", sa.String(length=320), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "content_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("created_by", sa.String(length=320), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_by", sa.String(length=320), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("self_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("release", sa.String(length=32), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("content_versions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_content_versions_status"), ["status"], unique=False)

    op.create_table(
        "staff_members",
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=12), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("invited_by", sa.String(length=320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("email"),
    )
    op.create_table(
        "content_docs",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("version_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("updated_by", sa.String(length=320), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["version_id"], ["content_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version_id", "kind", "key", name="uq_content_docs_key"),
    )
    with op.batch_alter_table("content_docs", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_content_docs_version_id"), ["version_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("content_docs", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_content_docs_version_id"))

    op.drop_table("content_docs")
    op.drop_table("staff_members")
    with op.batch_alter_table("content_versions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_content_versions_status"))

    op.drop_table("content_versions")
    op.drop_table("content_assets")
    with op.batch_alter_table("admin_log", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_admin_log_at"))
        batch_op.drop_index(batch_op.f("ix_admin_log_action"))

    op.drop_table("admin_log")
