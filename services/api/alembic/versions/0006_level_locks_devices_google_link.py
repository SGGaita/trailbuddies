"""Sprint 6: per-subject level locks, device names, Google sign-in link, consent region, lesson settings.

Existing rows get empty level locks and lesson settings (server_default), no device name,
no Google link and no region (consents given before Sprint 6 were under the family's country
at the time; the app asks again only if the country later changes region).

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-24 12:41:56.900044
"""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("consents", schema=None) as batch_op:
        batch_op.add_column(sa.Column("region", sa.String(length=32), nullable=True))

    # Consents already given were under the family's country's rules at the time.
    regions = {
        "KE": "kenya-dpa",
        "UG": "uganda-dppa",
        "TZ": "tanzania-pdpa",
        "NG": "nigeria-ndpa",
        "ZA": "south-africa-popia",
        "GB": "uk-gdpr",
        "US": "us-coppa",
    }
    cases = " ".join(f"WHEN '{c}' THEN '{r}'" for c, r in regions.items())
    op.execute(
        "UPDATE consents SET region = (SELECT CASE families.country "
        f"{cases} ELSE 'strict' END FROM families WHERE families.id = consents.family_id)"
    )

    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.add_column(sa.Column("options", sa.JSON(), nullable=False, server_default="{}"))

    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.add_column(sa.Column("levels", sa.JSON(), nullable=False, server_default="{}"))

    with op.batch_alter_table("sessions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("device_name", sa.String(length=60), nullable=True))

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("google_sub", sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint("uq_users_google_sub", ["google_sub"])


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("uq_users_google_sub", type_="unique")
        batch_op.drop_column("google_sub")

    with op.batch_alter_table("sessions", schema=None) as batch_op:
        batch_op.drop_column("device_name")

    with op.batch_alter_table("learners", schema=None) as batch_op:
        batch_op.drop_column("levels")

    with op.batch_alter_table("custom_lessons", schema=None) as batch_op:
        batch_op.drop_column("options")

    with op.batch_alter_table("consents", schema=None) as batch_op:
        batch_op.drop_column("region")
