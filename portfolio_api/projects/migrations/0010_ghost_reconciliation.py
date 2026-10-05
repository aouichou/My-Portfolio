# F1-02 — Ghost-migration reconciliation (rework/v2, ADR 0001 G3 discipline).
#
# WHY THIS EXISTS
# ===============
# In production, a boot-time `makemigrations` run (2025-11-25 16:46) generated
# and applied `projects.0008_alter_galleryimage_image_alter_project_thumbnail`
# against stale models. The file was later deleted from the repo, but its row
# remained in the prod `django_migrations` ledger — a *ghost*: applied in the
# database, absent on disk. Exact name verified from the frozen pre-rework dump
# (backups/neon-pre-rework-20261002.dump) during G3 baking.
#
# The on-disk `0008_alter_galleryimage_image_alter_project_thumbnail_and_more`
# (applied 17:00, a different migration) is NOT the ghost and is NOT touched.
#
# WHAT THIS DOES
# ==============
# Deletes exactly that one ledger row so `showmigrations` / future migrations
# run against a clean history (Django's loader already ignores applied-but-
# missing rows, so the drift was latent, not fatal — this removes it anyway).
#
# Idempotent by construction: deleting a non-existent row is a SQL no-op, so
# this is safe on databases where the ghost was already removed (e.g. fresh
# test databases created by migrating from scratch) and safe to re-run.
#
# Reversing re-inserts the row (with applied = CURRENT_TIMESTAMP, portable
# across PostgreSQL and SQLite) so the migration is fully reversible.
#
# Ledger arithmetic after applying on the restored dump: 28 rows - 1 ghost
# + 1 (this migration, recorded by Django's recorder) = 28 — the G3 expected
# constant therefore stays 28. VERIFIED during F1-02, not assumed.

from django.db import migrations

# The ghost — kept as a module constant so the SQL and any future audits
# reference a single source of truth.
GHOST_MIGRATION_NAME = '0008_alter_galleryimage_image_alter_project_thumbnail'


class Migration(migrations.Migration):

    dependencies = [
        # Linear chain end of the on-disk projects history at F1-02 time.
        ('projects', '0009_add_project_type_and_internship_fields'),
    ]

    operations = [
        migrations.RunSQL(
            # Remove ONLY the ghost row — no other ledger rows are touched.
            sql=(
                "DELETE FROM django_migrations "
                "WHERE app = 'projects' AND name = '%s';"
                % GHOST_MIGRATION_NAME
            ),
            reverse_sql=(
                "INSERT INTO django_migrations (app, name, applied) "
                "VALUES ('projects', '%s', CURRENT_TIMESTAMP);"
                % GHOST_MIGRATION_NAME
            ),
        ),
    ]
