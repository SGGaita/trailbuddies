"""Sprint 9: schools, teachers, classes, class rosters and class play, and Juma the elephant
becomes Jumbo (learners who chose him keep him under his new name).

Roster children have a first name and an initial only, no birth date.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-03 03:10:02.460194
"""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "schools",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("domain", sa.String(length=120), nullable=True),
        sa.Column("created_by", sa.String(length=26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_by", sa.String(length=26), nullable=True),
        sa.Column("consent_evidence", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["consent_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("schools", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_schools_domain"), ["domain"], unique=True)

    op.create_table(
        "classes",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("teacher_id", sa.String(length=26), nullable=False),
        sa.Column("school_id", sa.String(length=26), nullable=True),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("year_group", sa.String(length=30), nullable=False),
        sa.Column("band", sa.String(length=12), nullable=False),
        sa.Column("join_code", sa.String(length=6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("classes", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_classes_join_code"), ["join_code"], unique=True)
        batch_op.create_index(batch_op.f("ix_classes_school_id"), ["school_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_classes_teacher_id"), ["teacher_id"], unique=False)

    op.create_table(
        "teachers",
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("school_id", sa.String(length=26), nullable=True),
        sa.Column("tips", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    with op.batch_alter_table("teachers", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_teachers_school_id"), ["school_id"], unique=False)

    op.create_table(
        "class_students",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("class_id", sa.String(length=26), nullable=False),
        sa.Column("first_name", sa.String(length=40), nullable=False),
        sa.Column("initial", sa.String(length=1), nullable=True),
        sa.Column("avatar_color", sa.String(length=16), nullable=False),
        sa.Column("pictures", sa.JSON(), nullable=False),
        sa.Column("learner_id", sa.String(length=26), nullable=True),
        sa.Column("scope", sa.String(length=8), server_default="class", nullable=False),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("linked_by", sa.String(length=26), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learner_id"], ["learners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["linked_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("class_students", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_class_students_class_id"), ["class_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_class_students_learner_id"), ["learner_id"], unique=False)

    op.create_table(
        "class_events",
        sa.Column(
            "seq", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), autoincrement=True, nullable=False
        ),
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("class_id", sa.String(length=26), nullable=False),
        sa.Column("student_id", sa.String(length=26), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["class_students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("seq"),
        sa.UniqueConstraint("id"),
    )
    with op.batch_alter_table("class_events", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_class_events_class_id"), ["class_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_class_events_student_id"), ["student_id"], unique=False)

    op.execute("UPDATE learners SET buddy = 'jumbo' WHERE buddy = 'juma'")


def downgrade() -> None:
    op.execute("UPDATE learners SET buddy = 'juma' WHERE buddy = 'jumbo'")
    with op.batch_alter_table("class_events", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_class_events_student_id"))
        batch_op.drop_index(batch_op.f("ix_class_events_class_id"))

    op.drop_table("class_events")
    with op.batch_alter_table("class_students", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_class_students_learner_id"))
        batch_op.drop_index(batch_op.f("ix_class_students_class_id"))

    op.drop_table("class_students")
    with op.batch_alter_table("teachers", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_teachers_school_id"))

    op.drop_table("teachers")
    with op.batch_alter_table("classes", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_classes_teacher_id"))
        batch_op.drop_index(batch_op.f("ix_classes_school_id"))
        batch_op.drop_index(batch_op.f("ix_classes_join_code"))

    op.drop_table("classes")
    with op.batch_alter_table("schools", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_schools_domain"))

    op.drop_table("schools")
