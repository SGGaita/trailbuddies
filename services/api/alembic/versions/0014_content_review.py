"""Content review (CMS-06) and roll back (CMS-07): who submitted, approved and rolled back a version.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-22 22:11:48.601404
"""

import sqlalchemy as sa

from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("content_versions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("submitted_by", sa.String(length=320), nullable=True))
        batch_op.add_column(sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("approved_by", sa.String(length=320), nullable=True))
        batch_op.add_column(sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("review_note", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("rolled_back_from", sa.Integer(), nullable=True))


def downgrade() -> None:
    # Before review existed a version was a draft or published.
    op.execute("UPDATE content_versions SET status = 'draft' WHERE status IN ('submitted', 'approved')")
    with op.batch_alter_table("content_versions", schema=None) as batch_op:
        batch_op.drop_column("rolled_back_from")
        batch_op.drop_column("review_note")
        batch_op.drop_column("approved_at")
        batch_op.drop_column("approved_by")
        batch_op.drop_column("submitted_at")
        batch_op.drop_column("submitted_by")
