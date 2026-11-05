"""Sprint 10: groups within a class, assignments, classroom devices, and 'Ask my teacher'.

Only adds tables and one nullable column, so the running API keeps working while it runs.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-04 23:45:17.029539
"""

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assignments",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("class_id", sa.String(length=26), nullable=False),
        sa.Column("kind", sa.String(length=8), nullable=False),
        sa.Column("unit_id", sa.String(length=80), nullable=True),
        sa.Column("lesson", sa.JSON(), nullable=True),
        sa.Column("lesson_family_id", sa.String(length=26), nullable=True),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("target", sa.JSON(), nullable=False),
        sa.Column("due_on", sa.Date(), nullable=True),
        sa.Column("created_by", sa.String(length=26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lesson_family_id"], ["families.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("assignments", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_assignments_class_id"), ["class_id"], unique=False)

    op.create_table(
        "class_groups",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("class_id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("class_groups", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_class_groups_class_id"), ["class_id"], unique=False)

    op.create_table(
        "classroom_devices",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("class_id", sa.String(length=26), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("classroom_devices", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_classroom_devices_class_id"), ["class_id"], unique=False)

    op.create_table(
        "class_group_members",
        sa.Column("group_id", sa.String(length=26), nullable=False),
        sa.Column("student_id", sa.String(length=26), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["class_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["class_students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("group_id", "student_id"),
    )
    with op.batch_alter_table("class_group_members", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_class_group_members_student_id"), ["student_id"], unique=False)

    with op.batch_alter_table("class_students", schema=None) as batch_op:
        batch_op.add_column(sa.Column("help_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("class_students", schema=None) as batch_op:
        batch_op.drop_column("help_at")

    with op.batch_alter_table("class_group_members", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_class_group_members_student_id"))

    op.drop_table("class_group_members")
    with op.batch_alter_table("classroom_devices", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_classroom_devices_class_id"))

    op.drop_table("classroom_devices")
    with op.batch_alter_table("class_groups", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_class_groups_class_id"))

    op.drop_table("class_groups")
    with op.batch_alter_table("assignments", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_assignments_class_id"))

    op.drop_table("assignments")
