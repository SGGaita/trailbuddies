"""A grown-up's lesson plan for one child (PAR-09/10): hidden trails and units, skipped lessons, unit order.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-26 00:36:11.710051
"""

import sqlalchemy as sa

from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("lesson_plan", sa.JSON(), server_default="{}", nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("lesson_plan")
