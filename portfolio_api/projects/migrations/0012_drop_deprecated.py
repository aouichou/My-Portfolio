# F1-06 — Schema v2, part 2: post-ETL drops + constraint (rework/v2).
#
# Field map: docs/designs/2026-10-05-schema-v2-field-map.md (§2.1, §2.3, §3.1, §5.6, §5.10)
#
# WHAT THIS DOES:
#   - Drops the deprecated Internship/InternshipProject models (tables + indexes)
#   - Drops the rescued-then-obsolete Project columns (diagram_type,
#     architecture_diagram, company, role, start_date, end_date)
#   - Adds the DB-level project_type CheckConstraint
#
# WHY POST-ETL (separate migration, not folded into 0011): the deprecated
# tables AND the legacy Project columns are rescue SOURCES for the F1-07 etl_v2
# command. The flip-window order is reconcile → 0011 (additive) → etl_v2
# --apply → 0012 (drops + constraint) → contact delta (map §5.10). The
# constraint specifically must land post-ETL: "adding it in 0011 would fail
# on pre-ETL rows (project_type='internship' with no FK yet)" is the map's
# §5.6 warning shape — no v2-invalid rows may exist when it lands.
#
# NOTE ON THE CONSTRAINT'S REACH: the check pins project_type to the three
# v2 choices. It cannot fail on the restored dump's 12 rows (all school/
# internship — verified in the F1-05 ground-truth read) nor on ETL output.
#
# REVERSIBILITY (task requirement): explicit reverse operations.
#   - Reverse recreates the dropped tables/columns EMPTY — deprecated content
#     is not restorable from the migration; restoring DATA is the dump's job
#     (backups/neon-pre-rework-20261002.dump, profile rule 4 restore point).
#     Schema shape is fully restored in reverse.
#   - Documented manual reverse: none needed beyond `migrate projects 0011`.

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0011_schema_v2'),
    ]

    operations = [
        # Post-ETL DB-level guard (map §3.1/§5.6)
        migrations.AddConstraint(
            model_name='project',
            constraint=models.CheckConstraint(condition=models.Q(('project_type__in', ['school', 'internship', 'personal'])), name='project_type_valid'),
        ),

        # Legacy Project columns die after ETL rescued their content
        migrations.RemoveField(
            model_name='project',
            name='diagram_type',
        ),
        migrations.RemoveField(
            model_name='project',
            name='architecture_diagram',
        ),
        migrations.RemoveField(
            model_name='project',
            name='company',
        ),
        migrations.RemoveField(
            model_name='project',
            name='role',
        ),
        migrations.RemoveField(
            model_name='project',
            name='start_date',
        ),
        migrations.RemoveField(
            model_name='project',
            name='end_date',
        ),

        # Deprecated twins die (map §2.1/§2.3) — rescue happened in F1-07's
        # etl_v2 --apply (or the tables were empty in rehearsal).
        migrations.DeleteModel(name='InternshipProject'),
        migrations.DeleteModel(name='Internship'),
    ]
