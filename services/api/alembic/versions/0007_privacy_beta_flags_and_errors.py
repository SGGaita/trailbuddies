"""Sprint 7: privacy (export, family deletion, learner removal, media retention), signed US
consent, feature flags and cohorts, beta invite codes and feedback, and our own error log.

Existing consents stay approved. Existing families count as active from their last edit, so
nobody is warned about inactivity because of this migration.

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-25 15:45:30.201520
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beta_codes",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("cohort", sa.String(length=32), nullable=False),
        sa.Column("max_uses", sa.Integer(), nullable=False),
        sa.Column("uses", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "error_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=8), nullable=False),
        sa.Column("release", sa.String(length=32), nullable=False),
        sa.Column("screen", sa.String(length=80), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("stack", sa.Text(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("error_reports", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_error_reports_at"), ["at"], unique=False)

    op.create_table(
        "feature_flags",
        sa.Column("key", sa.String(length=48), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("everyone", sa.Boolean(), nullable=False),
        sa.Column("cohorts", sa.JSON(), nullable=False),
        sa.Column("families", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_table(
        "data_exports",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("requested_by", sa.String(length=26), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    with op.batch_alter_table("data_exports", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_data_exports_expires_at"), ["expires_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_data_exports_family_id"), ["family_id"], unique=False)

    op.create_table(
        "family_deletions",
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("requested_by", sa.String(length=26), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("purge_after", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("family_id"),
    )
    with op.batch_alter_table("family_deletions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_family_deletions_purge_after"), ["purge_after"], unique=False)
        batch_op.create_index(batch_op.f("ix_family_deletions_token_hash"), ["token_hash"], unique=True)

    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("family_id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("kind", sa.String(length=12), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("screen", sa.String(length=80), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["family_id"], ["families.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_feedback_created_at"), ["created_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_feedback_family_id"), ["family_id"], unique=False)

    with op.batch_alter_table("consents", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("status", sa.String(length=12), server_default="approved", nullable=False)
        )
        batch_op.add_column(sa.Column("evidence", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("families", schema=None) as batch_op:
        batch_op.add_column(sa.Column("cohorts", sa.JSON(), server_default="[]", nullable=False))
        batch_op.add_column(
            sa.Column(
                "active_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            )
        )
        batch_op.add_column(sa.Column("retention_notice", sa.String(length=8), nullable=True))

    op.execute("UPDATE families SET active_at = updated_at WHERE updated_at IS NOT NULL")

    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("removing_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.add_column(sa.Column("released_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f("ix_media_assets_released_at"), ["released_at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("media_assets", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_media_assets_released_at"))
        batch_op.drop_column("released_at")

    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("removing_at")

    with op.batch_alter_table("families", schema=None) as batch_op:
        batch_op.drop_column("retention_notice")
        batch_op.drop_column("active_at")
        batch_op.drop_column("cohorts")

    with op.batch_alter_table("consents", schema=None) as batch_op:
        batch_op.drop_column("reviewed_at")
        batch_op.drop_column("evidence")
        batch_op.drop_column("status")

    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_feedback_family_id"))
        batch_op.drop_index(batch_op.f("ix_feedback_created_at"))

    op.drop_table("feedback")
    with op.batch_alter_table("family_deletions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_family_deletions_token_hash"))
        batch_op.drop_index(batch_op.f("ix_family_deletions_purge_after"))

    op.drop_table("family_deletions")
    with op.batch_alter_table("data_exports", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_data_exports_family_id"))
        batch_op.drop_index(batch_op.f("ix_data_exports_expires_at"))

    op.drop_table("data_exports")
    op.drop_table("feature_flags")
    with op.batch_alter_table("error_reports", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_error_reports_at"))

    op.drop_table("error_reports")
    op.drop_table("beta_codes")
