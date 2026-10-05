# portfolio_api/projects/management/commands/etl_v2.py
"""
F1-07 SCAFFOLD (schema v2 ETL) — landed with F1-06 because the F1-05 contract
suite pins the command's existence and flags (`--dry-run/--apply/--verify`,
tests/test_schema_v2.py TestEtlV2CommandContract).

STATUS: scaffold only. The rescue logic (deprecated-table content →
Experience + Project rich fields, per field map §2.2/§2.3 and risk notes §5)
is F1-07's deliverable. Until then this command intentionally reports
"not implemented" and exits non-zero on --apply so nobody mistakes it for
a working ETL.
"""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        'Schema v2 ETL: rescue deprecated internship rich content into '
        'Experience + Project canonical shapes (F1-07). Scaffold: modes are '
        'declared, rescue logic not yet implemented.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true', dest='dry_run',
            help='Report what the ETL would rescue/change, change nothing',
        )
        parser.add_argument(
            '--apply', action='store_true', dest='apply',
            help='Apply the rescue (overwrite-idempotent for rescued fields)',
        )
        parser.add_argument(
            '--verify', action='store_true', dest='verify',
            help='Verify canonical shapes post-ETL (read-only report)',
        )

    def handle(self, *args, **options):
        self.stdout.write('etl_v2: scaffold only — rescue logic lands with F1-07')
        if options['apply']:
            raise CommandError(
                'etl_v2 --apply is not implemented yet (F1-07); refusing to '
                'touch data'
            )
        self.stdout.write(self.style.WARNING(
            'No mode implemented yet: pass --dry-run/--apply/--verify '
            '(F1-07 contract) — see docs/designs/2026-10-05-schema-v2-field-map.md'
        ))
