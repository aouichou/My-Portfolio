"""
F1-07 — Schema v2 ETL: lossless rescue of stale-table content (rework/v2).

SPEC: docs/designs/2026-10-05-schema-v2-field-map.md ("Annex A") §2 (per-field
ETL expressions), §3.4 (canonical JSON shapes), §5 (risk notes), plus the F1-04
decision values (master plan v2.2):
  - D3: retype `mistral-realms` → `personal`
  - D4: Experience.role = "Fullstack Engineer intern" (stale row said
    "Fullstack Engineer"; the approved framing is written at ETL time)
  - Fabricated internship score=100 → null (map §2.1 `score`)

SOURCE STRATEGY (task F1-07, option b): the deprecated tables
(projects_internship / projects_internshipproject) and the v1 Project columns
(diagram_type / architecture_diagram / company / role / start_date / end_date)
are rescue sources that no longer exist in the live schema after 0012. The
committed fixture `projects/fixtures/stale_internship_content.json` —
extracted ONCE from the frozen pre-rework dump by
`scripts/extract_stale_fixture.sh` — is the ETL's ONLY source of stale
content. This makes the ETL deterministic and re-runnable forever,
independent of migration state. In the flip window the command runs BETWEEN
0011 and 0012 (map §5.10); in rehearsal it runs after 0012 — same behavior,
because the fixture (not the live schema) is the source.

TYPE-SNIFF RULE (map §5.2 — declarations lie): every coercion branches on
isinstance at runtime. Ground truth from the frozen dump:
  - technologies / tech_stack      → flat string lists (never rich objects)
  - stats / impact_metrics         → dicts (never lists)
  - badges                         → [{text, color}] (color dies, brief §2.5)
  - demo_commands / code_steps     → dicts (keys are labels / order numbers)
  - code_snippets                  → dict-of-strings|objects (school rows) or
                                     array-of-objects (internship rows)
  - related_documentation (IP)     → [{icon, title, category, description}]
                                     holding '...' placeholder content (the
                                     map believed it empty — dump says
                                     placeholders; rescued shape-only)
  - IP thumbnails                  → real media paths (the map believed
                                     null/''; the Nov-24/26 admin edits added
                                     them after the old migrator ran)

SEMANTICS (map §5.8):
  - RESCUED fields are overwrite-idempotent (safe re-run → zero changes)
  - FIELDS THE OLD MIGRATOR ALREADY MOVED are verify-only (assert equality,
    never clobber post-migration admin edits; divergence is reported, and the
    LIVE unified value always wins)
  - Match on slug; orphan detection halts the command
  - `--dry-run` (default) prints the plan; `--apply` executes it;
    `--verify` post-checks invariants and exits non-zero on violation
"""

import json
from dataclasses import dataclass
from dataclasses import field as dc_field
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date, parse_datetime

from projects.models import Experience, Project

FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / 'fixtures' / 'stale_internship_content.json'
)

# F1-04 decision values (master plan v2.2)
PERSONAL_TYPE_SLUGS = ('mistral-realms',)  # D3
EXPERIENCE_ROLE = 'Fullstack Engineer intern'  # D4

# The three unified internship rows and their stale InternshipProject sources
# join on slug (dump-verified: pks 14/15/16 ↔ 4/5/6). Verified against the
# fixture at load time — a mismatch halts the command (never silently skip).
INTERNSHIP_SLUGS = (
    'clinical-analytics-platform',
    'keycloak-integration-library',
    'patient-monitoring-module',
)


# ═════════════════════════════════════════════════════════════════════════════
# Pure coercion helpers (map §3.4 canonical shapes; unit-tested)
# ═════════════════════════════════════════════════════════════════════════════

def humanize(key: str) -> str:
    """map §3.4: underscore→space, title-case ('test_files' → 'Test Files')."""
    return key.replace('_', ' ').title()


def to_tech_list(value):
    """Canonical [{name: str, category?: str}] — live sources are flat strings."""
    if not value:
        return []
    if isinstance(value, dict):  # unseen in the dump; tolerated deterministically
        return [{'name': str(k)} for k in value]
    out = []
    for item in value:
        if isinstance(item, dict):
            entry = {'name': str(item.get('name', ''))}
            if item.get('category'):
                entry['category'] = str(item['category'])
            out.append(entry)
        else:
            out.append({'name': str(item)})
    return out


def to_label_value(value):
    """Canonical [{label: str, value: str}] — live sources are dicts."""
    if not value:
        return []
    if isinstance(value, dict):
        return [{'label': humanize(str(k)), 'value': str(v)} for k, v in value.items()]
    out = []
    for item in value:
        if isinstance(item, dict):
            out.append({
                'label': str(item.get('label', '')),
                'value': str(item.get('value', '')),
            })
        else:
            out.append({'label': '', 'value': str(item)})
    return out


def to_impact_list(value):
    """Canonical [{label, value, description?}] — live sources are dicts of
    key → short value or key → sentence (sentence doubles as the value)."""
    items = to_label_value(value)
    for entry in items:
        if entry['value'] and len(entry['value']) > 120:
            # Long sentences read better as descriptions (map §2.2
            # impact_metrics: 'description from value sentences where present')
            entry['description'] = entry['value']
            entry['value'] = ''
    return items


def to_badge_list(value):
    """Canonical [{text: str}] — color/variant keys stripped (brief §2.5)."""
    if not value:
        return []
    out = []
    for item in value:
        if isinstance(item, dict):
            out.append({'text': str(item.get('text', ''))})
        else:
            out.append({'text': str(item)})
    return out


def to_demo_commands(value):
    """Canonical [{label: str, command: str}] — live shape is a dict (map §2.1)."""
    if not value:
        return []
    if isinstance(value, dict):
        return [
            {'label': humanize(str(k)), 'command': str(v)} for k, v in value.items()
        ]
    out = []
    for item in value:
        if isinstance(item, dict):
            out.append({
                'label': str(item.get('label', '')),
                'command': str(item.get('command', '')),
            })
        else:
            out.append({'label': '', 'command': str(item)})
    return out


def to_code_steps(value):
    """Canonical [str] — live shape is {'1': ..., '2': ...} ordered by int key
    (map §2.1: `[d[k] for k in sorted(int keys)]`)."""
    if not value:
        return []
    if isinstance(value, dict):
        # Legacy frontend artifact (old validate_code_steps): a single '0' key
        # holding the real dict — unwrap before ordering.
        if set(value) == {'0'} and isinstance(value['0'], dict):
            value = value['0']

        def sort_key(key):
            try:
                return (0, int(key), '')
            except (TypeError, ValueError):
                return (1, 0, str(key))

        return [str(value[k]) for k in sorted(value, key=sort_key)]
    return [str(item) for item in value]


def to_code_snippets(value):
    """Canonical [{title?, description?, language?, code}].

    School rows hold dict-of-strings|objects — inflated with the deleted
    serializer's exact rules (map §2.1: 'reuse the inflation logic'). The one
    deviation: the legacy 'explanation' key is not carried (not in the §3.4
    canonical shape). Internship rows hold arrays of objects — normalized to
    canonical keys, `code` padded to '' when absent (flagged by the caller).
    """
    if not value:
        return []
    if isinstance(value, dict):
        out = []
        for key, item in value.items():
            title_fallback = str(key).replace('_', ' ').title()
            if isinstance(item, str):
                out.append({
                    'code': item,
                    'title': title_fallback,
                    'description': f'Implementation of {str(key).replace("_", " ")}',
                    'language': 'c',
                })
            elif isinstance(item, dict):
                out.append({
                    'code': str(item.get('code', '')),
                    'title': str(item.get('title', title_fallback)),
                    'description': str(item.get('description', '')),
                    'language': str(item.get('language', 'c')),
                })
        return out
    out = []
    for item in value:
        if isinstance(item, dict):
            entry = {}
            if item.get('title'):
                entry['title'] = str(item['title'])
            if item.get('description'):
                entry['description'] = str(item['description'])
            if item.get('language'):
                entry['language'] = str(item['language'])
            entry['code'] = str(item.get('code', ''))
            out.append(entry)
        else:
            out.append({'code': str(item)})
    return out


def to_doc_list(value):
    """Canonical [{title, description?, category?}] — icon keys stripped."""
    if not value:
        return []
    out = []
    for item in value:
        if not isinstance(item, dict):
            out.append({'title': str(item)})
            continue
        entry = {'title': str(item.get('title', ''))}
        if item.get('description'):
            entry['description'] = str(item['description'])
        if item.get('category'):
            entry['category'] = str(item['category'])
        out.append(entry)
    return out


def to_diagrams_from_v1(architecture_diagram, diagram_type):
    """School rows: single text + type → single-element canonical array
    (map §2.1: the dropped `architecture_diagram`/`diagram_type` columns)."""
    if not architecture_diagram:
        return []
    return [{
        'title': 'Architecture',
        'type': diagram_type if diagram_type in ('mermaid', 'flowchart', 'custom') else 'custom',
        'content': architecture_diagram,
        'description': '',
    }]


def to_diagrams_from_ip(ip_architecture_diagrams):
    """InternshipProject lists → canonical array (map §2.1 expression verbatim):
    `[{'title': o.get('title') or 'Architecture', 'type': 'mermaid',
    'content': o['diagram'], 'description': o.get('description', '')}]`.
    The old migrator kept only [0] — this restores the FULL list."""
    out = []
    for item in ip_architecture_diagrams or []:
        out.append({
            'title': item.get('title') or 'Architecture',
            'type': 'mermaid',
            'content': item['diagram'],
            'description': item.get('description', ''),
        })
    return out


def summarize(value, limit: int = 60) -> str:
    """Short readable rendering of a plan value for --dry-run output."""
    text = repr(value)
    if len(text) > limit:
        text = text[:limit] + f'…(+{len(text) - limit} chars)'
    return text


# ═════════════════════════════════════════════════════════════════════════════
# Fixture + source-field mapping (the "zero unmapped fields" ledger)
# ═════════════════════════════════════════════════════════════════════════════

def load_fixture() -> dict:
    """Read the frozen stale-content fixture; regenerate instructions on miss."""
    if not FIXTURE_PATH.is_file():
        raise CommandError(
            f'Stale-content fixture not found: {FIXTURE_PATH}\n'
            f'Regenerate it from the frozen dump: bash scripts/extract_stale_fixture.sh'
        )
    with open(FIXTURE_PATH, encoding='utf-8') as fh:
        return json.load(fh)


def validate_fixture(fixture: dict) -> dict:
    """Counts + slug-join integrity (map §5.8 — a mismatch halts, never skips)."""
    counts = fixture.get('_meta', {}).get('row_counts', {})
    if counts.get('internship') != 1 or counts.get('internshipproject') != 3:
        raise CommandError(
            f'Fixture row counts are not the frozen 1/3: {counts} — regenerate '
            f'via scripts/extract_stale_fixture.sh'
        )
    ip_slugs = {row['slug'] for row in fixture['internshipprojects']}
    if ip_slugs != set(INTERNSHIP_SLUGS):
        raise CommandError(
            f'Fixture InternshipProject slugs {sorted(ip_slugs)} do not match the '
            f'dump-verified unified slugs {sorted(INTERNSHIP_SLUGS)} — refusing to '
            f'guess (slug join integrity, map §5.8)'
        )
    project_slugs = {row['slug'] for row in fixture['project_rows']}
    if counts.get('project') != 12 or len(project_slugs) != 12:
        raise CommandError(
            f'Fixture project_rows must hold the frozen 12 rows '
            f'(got {counts.get("project")}) — regenerate the fixture'
        )
    return fixture


# Disposition of EVERY fixture source field — the unmapped-fields ledger.
# 'verify'   = old migrator already moved it; ETL asserts equality, never writes
# 'copy'     = rescued into v2 (overwrite-idempotent)
# 'canon'    = live value canonicalized in place (shape-only change)
# 'transform'= converted into another field's shape
# 'drop'     = intentionally not carried; reason recorded (never silent)
SOURCE_FIELD_DISPOSITIONS = {
    'internship': {
        'company': 'copy', 'role': 'copy', 'subtitle': 'copy', 'slug': 'copy',
        'start_date': 'copy', 'end_date': 'copy', 'overview': 'copy',
        'stats': 'copy', 'technologies': 'copy', 'impact_metrics': 'copy',
        'architecture_description': 'copy', 'code_samples': 'copy',
        'documentation': 'copy', 'is_active': 'copy', 'order': 'copy',
        'created_at': 'copy', 'updated_at': 'copy',
        'architecture_diagram': 'transform',
        'id': 'drop: surrogate key — Experience gets its own',
    },
    'internshipprojects': {
        'title': 'verify', 'description': 'verify', 'overview': 'verify→readme',
        'tech_stack': 'verify', 'key_features': 'verify→features',
        'role_description': 'verify', 'stats': 'verify', 'badges': 'verify',
        'impact_metrics': 'verify', 'code_snippets': 'verify',
        'is_featured': 'verify', 'thumbnail_url': 'verify',
        'thumbnail': 'verify: live rows were re-uploaded under projects/ '
                     '(files exist there) after the old migrator ran; the '
                     'stale IP paths (internship/projects/…) point at '
                     'nothing — live wins (§5.8)',
        'architecture_description': 'copy', 'architecture_diagrams': 'copy',
        'related_documentation': 'copy', 'order': 'copy', 'created_at': 'copy',
        'slug': 'drop: join key — global-unique Project.slug supersedes',
        'id': 'drop: surrogate key',
        'internship_id': 'drop: FK — Project.experience replaces',
        'updated_at': 'drop: auto_now tracks post-ETL edits (map §2.1 backfills '
                      'created_at only)',
    },
    'project_rows': {
        'title': 'verify', 'slug': 'verify', 'description': 'verify',
        'thumbnail': 'verify', 'thumbnail_url': 'verify', 'is_featured': 'verify',
        'readme': 'verify', 'features': 'canon', 'lessons': 'verify',
        'live_url': 'verify', 'code_url': 'verify', 'video_url': 'verify',
        'role_description': 'verify (old-migrator copy; per-project truth)',
        'score': 'canon: fabricated 100s nulled on internship rows',
        'tech_stack': 'canon', 'stats': 'canon', 'badges': 'canon',
        'impact_metrics': 'canon', 'demo_commands': 'canon',
        'code_steps': 'canon', 'code_snippets': 'canon',
        'challenges': 'canon: migrator pollution (role_description duplicate) '
                      'nulled on internship rows',
        'demo_files_path': 'canon: unverifiable paths nulled vs manifest (§5.4)',
        'project_type': 'canon: D3 retypes mistral-realms→personal',
        'diagram_type': 'transform→architecture_diagrams',
        'architecture_diagram': 'transform→architecture_diagrams',
        'has_interactive_demo': 'drop: renamed has_demo by 0011 (values carried)',
        'company': 'drop: moved to Experience by 0011/0012',
        'role': 'drop: moved to Experience (D4 value written at ETL time)',
        'start_date': 'drop: moved to Experience',
        'end_date': 'drop: moved to Experience',
        'id': 'drop: surrogate key — rows matched on slug',
    },
}


@dataclass
class FieldDiff:
    slug: str
    field_name: str
    old: object
    new: object
    reason: str


def _dt(value):
    return parse_datetime(value) if value else None


def build_experience_plan(fixture: dict):
    """Annex A §2.2 — the single Internship row → Experience values (1:1)."""
    row = fixture['internship'][0]
    values = {
        'company': row['company'],
        'role': EXPERIENCE_ROLE,  # D4 — replaces the stale 'Fullstack Engineer'
        'subtitle': row['subtitle'],
        'slug': row['slug'],
        'start_date': parse_date(row['start_date']),
        'end_date': parse_date(row['end_date']),
        'overview': row['overview'],
        'stats': to_label_value(row['stats']),
        'technologies': to_tech_list(row['technologies']),
        'impact_metrics': to_impact_list(row['impact_metrics']),
        'architecture_description': row['architecture_description'] or None,
        'architecture_diagrams': to_diagrams_from_v1(
            row['architecture_diagram'], 'mermaid'
        ),
        'code_samples': row['code_samples'],
        'documentation': to_doc_list(row['documentation']),
        'is_active': row['is_active'],
        'order': row['order'],
        'created_at': _dt(row['created_at']),
        'updated_at': _dt(row['updated_at']),
    }
    # The single-element diagram array keeps the map §2.2 title
    if values['architecture_diagrams']:
        values['architecture_diagrams'][0]['title'] = 'Zero Trust Architecture'

    diffs, notes = [], []
    existing = Experience.objects.filter(slug=values['slug']).first()
    if existing is None:
        diffs.append(FieldDiff(
            row['slug'], '(create Experience)', None, values['company'],
            '1:1 rescue of the deprecated Internship row (map §2.2)',
        ))
    else:
        for name, new in values.items():
            old = getattr(existing, name)
            if name in ('created_at', 'updated_at'):
                old = old.isoformat() if old else None
                new = new.isoformat() if new else None
            if old != new:
                diffs.append(FieldDiff(
                    row['slug'], f'Experience.{name}', old, new,
                    're-rescue drift (value differs from fixture)',
                ))
    notes.append(
        f"Experience.role = {EXPERIENCE_ROLE!r} written per D4 (stale row held "
        f"{row['role']!r})"
    )
    return values, diffs, notes


CANONICAL_SWEEP_FNS = {
    'tech_stack': to_tech_list,
    'stats': to_label_value,
    'badges': to_badge_list,
    'impact_metrics': to_impact_list,
    'code_snippets': to_code_snippets,
}


def build_project_plan(fixture: dict):
    """The per-slug plan: canonical sweep of all 12 live rows + rescue of the
    3 internship rows from the fixture's InternshipProject content."""
    manifest = set(fixture['demo_files_manifest'])
    ip_by_slug = {row['slug']: row for row in fixture['internshipprojects']}
    fixture_rows = {row['slug']: row for row in fixture['project_rows']}

    live_slugs = set(Project.objects.values_list('slug', flat=True))
    fixture_slugs = set(fixture_rows)
    if live_slugs != fixture_slugs:
        missing = fixture_slugs - live_slugs
        extra = live_slugs - fixture_slugs
        raise CommandError(
            f'Live Project slugs do not match the fixture (map §5.8 orphan '
            f'detection): missing from live = {sorted(missing)}, unexpected in '
            f'live = {sorted(extra)}. Halting — never silently skip.'
        )

    diffs: list[FieldDiff] = []
    notes: list[str] = []

    def add(slug, name, old, new, reason):
        if old != new:
            diffs.append(FieldDiff(slug, name, old, new, reason))

    for project in Project.objects.order_by('id'):
        slug = project.slug
        src = fixture_rows[slug]

        # ── Canonical sweep (all rows; shape-only, content preserved) ──────
        add(slug, 'tech_stack', project.tech_stack,
            to_tech_list(project.tech_stack), 'flat strings → [{name}] (§3.4)')
        add(slug, 'demo_commands', project.demo_commands,
            to_demo_commands(project.demo_commands),
            'dict → [{label, command}] (§2.1)')
        add(slug, 'code_steps', project.code_steps,
            to_code_steps(project.code_steps),
            'dict → ordered [str] (§2.1)')
        old_snippets = project.code_snippets
        new_snippets = to_code_snippets(old_snippets)
        add(slug, 'code_snippets', old_snippets, new_snippets,
            'dict inflation / array normalize → canonical (§2.1)')
        if isinstance(old_snippets, list):
            for item in old_snippets:
                if isinstance(item, dict) and not item.get('code'):
                    notes.append(
                        f'{slug}: code_snippets item {item.get("title")!r} had no '
                        f'"code" key (post-migrator admin edit) — padded to "" '
                        f'(content preserved, flagged not silent)'
                    )
        add(slug, 'stats', project.stats, to_label_value(project.stats),
            'dict → [{label, value}] (§3.4)')
        add(slug, 'badges', project.badges, to_badge_list(project.badges),
            'color/variant stripped → [{text}] (brief §2.5)')
        add(slug, 'impact_metrics', project.impact_metrics,
            to_impact_list(project.impact_metrics), 'dict → canonical (§3.4)')

        # ── demo_files_path vs reality (map §5.4) ──────────────────────────
        if project.demo_files_path and project.demo_files_path not in manifest:
            notes.append(
                f'{slug}: demo_files_path {project.demo_files_path!r} not in the '
                f'verified manifest — nulled (map §5.4; Phase 4 re-populates)'
            )
            add(slug, 'demo_files_path', project.demo_files_path, None,
                'unverifiable vs manifest (map §5.4)')

        # ── School-row architecture rescue from the dropped v1 columns ─────
        # (internship rows are excluded: their architecture source is the
        # stale InternshipProject list, rescued below — running both would
        # double-write the field and break idempotency)
        if slug not in ip_by_slug:
            diagrams = to_diagrams_from_v1(
                src.get('architecture_diagram'), src.get('diagram_type')
            )
            add(slug, 'architecture_diagrams', project.architecture_diagrams,
                diagrams,
                'v1 architecture_diagram + diagram_type → canonical array (§2.1)')

        # ── D3: personal typing ────────────────────────────────────────────
        if slug in PERSONAL_TYPE_SLUGS and project.project_type != 'personal':
            add(slug, 'project_type', project.project_type, 'personal',
                'D3 decision value (F1-04)')
            notes.append(f'{slug}: retyped school → personal (D3)')

        # ── Internship-row rescue + pollution cleanup ──────────────────────
        if slug in ip_by_slug:
            ip = ip_by_slug[slug]

            # Verify-only (map §2.3): the old migrator already moved these.
            for ip_field, live_field in (
                ('title', 'title'),
                ('description', 'description'),
                ('role_description', 'role_description'),
                ('is_featured', 'is_featured'),
                ('overview', 'readme'),
                ('key_features', 'features'),
                ('thumbnail', 'thumbnail'),  # live re-upload under projects/ wins
            ):
                if getattr(project, live_field) != ip[ip_field]:
                    notes.append(
                        f'{slug}: VERIFY-DIVERGENCE {live_field}: live differs '
                        f'from stale source — live value wins (§5.8 no-clobber)'
                    )
            for ip_field, live_field in (
                ('tech_stack', 'tech_stack'),
                ('stats', 'stats'),
                ('badges', 'badges'),
                ('impact_metrics', 'impact_metrics'),
                ('code_snippets', 'code_snippets'),
            ):
                expected = CANONICAL_SWEEP_FNS[live_field](ip[ip_field])
                live_after_sweep = CANONICAL_SWEEP_FNS[live_field](
                    getattr(project, live_field)
                )
                if live_after_sweep != expected:
                    notes.append(
                        f'{slug}: VERIFY-DIVERGENCE {live_field}: live (post-sweep) '
                        f'differs from stale source — live value wins (§5.8 '
                        f'no-clobber; post-migrator admin edits are legitimate)'
                    )

            # Rescued (map §2.3): the unmigrated remainder
            add(slug, 'architecture_description',
                project.architecture_description,
                ip['architecture_description'] or None,
                'RESCUE ← InternshipProject (§2.3)')
            add(slug, 'architecture_diagrams', project.architecture_diagrams,
                to_diagrams_from_ip(ip['architecture_diagrams']),
                'RESCUE full list ← InternshipProject (migrator kept only [0])')
            add(slug, 'related_documentation', project.related_documentation,
                to_doc_list(ip['related_documentation']),
                'RESCUE ← InternshipProject (§2.3; source holds placeholder '
                'content — shape rescued, flagged for admin)')
            add(slug, 'order', project.order, ip['order'],
                'RESCUE ← InternshipProject.order (§2.3)')
            add(slug, 'created_at', project.created_at,
                _dt(ip['created_at']), 'RESCUE provenance backfill (§2.1)')

            # Pollution cleanup (map §5.5, explicit + logged)
            if project.score is not None:
                add(slug, 'score', project.score, None,
                    'fabricated score=100 nulled (map §2.1/§5.5)')
                notes.append(f'{slug}: fabricated score={project.score} → null')
            if project.challenges:
                add(slug, 'challenges', project.challenges, None,
                    'migrator pollution (role_description duplicate) nulled '
                    '(map §2.1/§5.5)')

            # The Experience FK link (map §2.1)
            if project.experience_id is None:
                add(slug, 'experience', None, EXPERIENCE_ROLE,
                    'link to the rescued Experience row')

    return diffs, notes


class Command(BaseCommand):
    help = (
        'Schema v2 ETL (F1-07): lossless rescue of deprecated-table content '
        'into Experience + Project canonical shapes. Source: the committed '
        'fixture projects/fixtures/stale_internship_content.json (frozen '
        'pre-rework dump). --dry-run (default) prints the plan; --apply '
        'executes it (overwrite-idempotent for rescued fields); --verify '
        'post-checks invariants and exits non-zero on violation.'
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

    # ── mode dispatch ───────────────────────────────────────────────────────

    def handle(self, *args, **options):
        fixture = validate_fixture(load_fixture())
        if options['apply']:
            self.apply_mode(fixture)
        if options['verify']:
            self.verify()
        if not options['apply'] and not options['verify']:
            self.dry_run(fixture)  # default mode

    def dry_run(self, fixture):
        self.stdout.write(self.style.MIGRATE_HEADING(
            'etl_v2 — DRY RUN (no writes)'
        ))
        exp_values, exp_diffs, _ = build_experience_plan(fixture)
        diffs, notes = build_project_plan(fixture)
        self._print_plan(fixture, exp_values, exp_diffs, diffs, notes)
        self.stdout.write(self.style.WARNING(
            'DRY RUN — nothing was written. Re-run with --apply.'
        ))

    def _print_plan(self, fixture, exp_values, exp_diffs, diffs, notes):
        self.stdout.write(f'\nSource fixture: {FIXTURE_PATH.name}')
        meta = fixture['_meta']
        self.stdout.write(
            f"  dump={meta['source_dump']} sha256={meta['source_dump_sha256'][:16]}…"
            f" rows={meta['row_counts']}"
        )

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'\nExperience (1:1 rescue, slug={exp_values["slug"]!r})'
        ))
        for diff in exp_diffs:
            self._print_diff(diff)
        if not exp_diffs:
            self.stdout.write('  (no changes — already rescued)')

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'\nProjects ({Project.objects.count()} rows) — field diffs'
        ))
        by_slug = {}
        for diff in diffs:
            by_slug.setdefault(diff.slug, []).append(diff)
        for slug in sorted(by_slug):
            self.stdout.write(f'  {slug}:')
            for diff in by_slug[slug]:
                self._print_diff(diff, indent=4)
        if not diffs:
            self.stdout.write('  (no changes — already canonical)')

        self.stdout.write(self.style.MIGRATE_HEADING('\nCounts'))
        self.stdout.write(f'  experience diffs : {len(exp_diffs)}')
        self.stdout.write(f'  project diffs    : {len(diffs)}')
        self.stdout.write(f'  projects touched : {len({d.slug for d in diffs})}')
        self.stdout.write(f'  notes            : {len(notes)}')

        if notes:
            self.stdout.write(self.style.MIGRATE_HEADING(
                '\nNotes (explicit, never silent)'
            ))
            for note in notes:
                self.stdout.write(f'  - {note}')

    def _print_diff(self, diff, indent=2):
        pad = ' ' * indent
        self.stdout.write(
            f'{pad}{diff.field_name}: {summarize(diff.old)} → {summarize(diff.new)}'
            f'  [{diff.reason}]'
        )

    # ── --apply ─────────────────────────────────────────────────────────────

    def apply_mode(self, fixture):
        self.stdout.write(self.style.MIGRATE_HEADING('etl_v2 — APPLY'))

        exp_values, exp_diffs, notes = build_experience_plan(fixture)
        diffs, proj_notes = build_project_plan(fixture)
        notes = notes + proj_notes

        # 1. Experience upsert (match on slug; overwrite-idempotent)
        provenance = {
            'created_at': exp_values['created_at'],
            'updated_at': exp_values['updated_at'],
        }
        field_values = {k: v for k, v in exp_values.items() if k not in provenance}
        experience = Experience.objects.filter(slug=exp_values['slug']).first()
        created = experience is None
        if created:
            experience = Experience(**field_values)
        changed = []
        for name, value in field_values.items():
            if getattr(experience, name) != value:
                setattr(experience, name, value)
                changed.append(name)
        if created or changed:
            experience.save()
            # auto_now_add/auto_now cannot carry source provenance — raw update
            Experience.objects.filter(pk=experience.pk).update(**provenance)
        summary = ('created' if created else
                   f'{len(changed)} field(s) updated' if changed else
                   'no changes (idempotent)')
        self.stdout.write(self.style.SUCCESS(
            f'  Experience {exp_values["slug"]!r}: {summary}'
        ))

        # 2. Project updates (field-level skip-if-equal → true no-op re-run)
        by_slug = {}
        for diff in diffs:
            by_slug.setdefault(diff.slug, []).append(diff)

        touched = 0
        for slug, slug_diffs in sorted(by_slug.items()):
            project = Project.objects.get(slug=slug)
            fields = set()
            provenance_when = None
            for diff in slug_diffs:
                if diff.field_name == 'experience':
                    project.experience = experience
                    fields.add('experience')
                    continue
                if diff.field_name == 'created_at':
                    provenance_when = diff.new
                    continue
                setattr(project, diff.field_name, diff.new)
                fields.add(diff.field_name)
            if fields:
                project.save(update_fields=fields | {'updated_at'})
            if provenance_when is not None:
                # auto_now_add cannot be overridden via save() — raw update
                Project.objects.filter(pk=project.pk).update(
                    created_at=(parse_datetime(provenance_when)
                                 if isinstance(provenance_when, str)
                                 else provenance_when)
                )
            touched += 1
            self.stdout.write(self.style.SUCCESS(
                f'  {slug}: {len(slug_diffs)} field(s) updated'
            ))
        if not by_slug:
            self.stdout.write('  (no project changes — idempotent no-op)')

        self.stdout.write(self.style.MIGRATE_HEADING('\nApply summary'))
        self.stdout.write(f'  experience diffs applied: {len(exp_diffs)}')
        self.stdout.write(f'  project diffs applied   : {len(diffs)}')
        self.stdout.write(f'  projects touched        : {touched}')
        for note in notes:
            self.stdout.write(f'  - note: {note}')
        self.stdout.write(self.style.SUCCESS('APPLY complete.'))


    def verify(self):
        self.stdout.write(self.style.MIGRATE_HEADING('etl_v2 — VERIFY'))
        fixture = validate_fixture(load_fixture())
        failures = []

        def ok(msg):
            self.stdout.write(self.style.SUCCESS(f'  [PASS] {msg}'))

        def bad(msg):
            failures.append(msg)
            self.stdout.write(self.style.ERROR(f'  [FAIL] {msg}'))

        def check(cond, msg):
            ok(msg) if cond else bad(msg)

        ip_by_slug = {row['slug']: row for row in fixture['internshipprojects']}

        # 1. Row counts
        check(Project.objects.count() == 12,
              f'12 projects (got {Project.objects.count()})')
        check(Experience.objects.count() == 1,
              f'1 Experience (got {Experience.objects.count()})')

        # 2. The single Experience row (D4 + §2.2 canonical shapes)
        exp = Experience.objects.first()
        if exp is None:
            bad('Experience row missing — cannot check contents')
        else:
            src = fixture['internship'][0]
            check(exp.role == EXPERIENCE_ROLE,
                  f'Experience.role == {EXPERIENCE_ROLE!r} (D4)')
            for name, expected in (
                ('company', src['company']),
                ('subtitle', src['subtitle']),
                ('slug', src['slug']),
                ('overview', src['overview']),
                ('is_active', src['is_active']),
                ('order', src['order']),
                ('start_date', parse_date(src['start_date'])),
                ('end_date', parse_date(src['end_date'])),
                ('stats', to_label_value(src['stats'])),
                ('technologies', to_tech_list(src['technologies'])),
                ('impact_metrics', to_impact_list(src['impact_metrics'])),
                ('code_samples', src['code_samples']),
                ('documentation', to_doc_list(src['documentation'])),
                ('architecture_description', src['architecture_description'] or None),
            ):
                check(getattr(exp, name) == expected,
                      f'Experience.{name} matches fixture rescue')
            check(bool(exp.architecture_diagrams) and
                  exp.architecture_diagrams[0]['content'] == src['architecture_diagram'],
                  'Experience.architecture_diagrams carries the ZTA diagram')
            check(exp.created_at == _dt(src['created_at']),
                  'Experience.created_at provenance backfilled')
            if exp.end_date and exp.start_date:
                check(exp.end_date >= exp.start_date,
                      'Experience.end_date >= start_date (§3.3)')

        # 3. Per-project invariants
        manifest = set(fixture['demo_files_manifest'])
        fixture_rows = {row['slug']: row for row in fixture['project_rows']}
        for project in Project.objects.order_by('id'):
            slug = project.slug
            src = fixture_rows[slug]
            # Canonical shapes on every JSON field (§3.4)
            for name, validator in (
                ('tech_stack', lambda v: all('name' in o for o in v)),
                ('stats', lambda v: all(set(o) == {'label', 'value'} for o in v)),
                ('badges', lambda v: all(set(o) == {'text'} for o in v)),
                ('impact_metrics', lambda v: all(
                    {'label', 'value'} <= set(o) for o in v)),
                ('demo_commands', lambda v: all(
                    set(o) == {'label', 'command'} for o in v)),
                ('related_documentation', lambda v: all(
                    'title' in o and 'icon' not in o for o in v)),
                ('architecture_diagrams', lambda v: all(
                    {'title', 'type', 'content'} <= set(o) for o in v)),
            ):
                value = getattr(project, name)
                check(isinstance(value, list) and validator(value),
                      f'{slug}: {name} canonical (§3.4)')
            check(all(isinstance(s, str) for s in project.code_steps),
                  f'{slug}: code_steps is [str]')
            check(all('code' in o for o in project.code_snippets),
                  f'{slug}: code_snippets items carry code')
            check(project.project_type in ('school', 'internship', 'personal'),
                  f'{slug}: project_type valid')
            check(project.demo_files_path is None or
                  project.demo_files_path in manifest,
                  f'{slug}: demo_files_path null or verified')

            if slug in ip_by_slug:
                ip = ip_by_slug[slug]
                # Rescued fields non-null / exact
                check(project.architecture_diagrams ==
                      to_diagrams_from_ip(ip['architecture_diagrams']),
                      f'{slug}: architecture_diagrams == full stale list (RESCUE)')
                check(project.related_documentation ==
                      to_doc_list(ip['related_documentation']),
                      f'{slug}: related_documentation == stale (RESCUE)')
                check(project.order == ip['order'],
                      f'{slug}: order == {ip["order"]} (RESCUE)')
                check(project.architecture_description ==
                      (ip['architecture_description'] or None),
                      f'{slug}: architecture_description rescued (empty → None)')
                live_thumb = (project.thumbnail.name if project.thumbnail else None)
                check(live_thumb == (src.get('thumbnail') or None),
                      f'{slug}: thumbnail is the live re-upload (verify-only)')
                check(project.experience_id is not None,
                      f'{slug}: experience FK set')
                check(project.score is None,
                      f'{slug}: fabricated score nulled')
                check(project.challenges is None,
                      f'{slug}: challenges pollution nulled')
                check(project.created_at == _dt(ip['created_at']),
                      f'{slug}: created_at provenance backfilled')
            else:
                if slug in PERSONAL_TYPE_SLUGS:
                    check(project.project_type == 'personal',
                          f'{slug}: typed personal (D3)')
                else:
                    check(project.project_type == src['project_type'],
                          f'{slug}: type unchanged ({src["project_type"]})')
                    check(project.score == src['score'],
                          f'{slug}: school score preserved ({src["score"]})')
                check(project.architecture_diagrams ==
                      to_diagrams_from_v1(src.get('architecture_diagram'),
                                          src.get('diagram_type')),
                      f'{slug}: architecture_diagrams == v1 column conversion')

        # 4. Unmapped source fields (the task's zero-loss check)
        unmapped = []
        for section, dispositions in SOURCE_FIELD_DISPOSITIONS.items():
            rows = fixture.get(section, [])
            keys = set()
            for row in rows:
                keys |= set(row)
            for key in sorted(keys - set(dispositions)):
                unmapped.append(f'{section}.{key}')
        check(not unmapped,
              f'zero unmapped source fields (unmapped: {unmapped or "none"})')

        # 5. Verdict
        self.stdout.write('')
        if failures:
            self.stdout.write(self.style.ERROR(
                f'VERIFY FAILED — {len(failures)} violation(s):'
            ))
            for failure in failures:
                self.stdout.write(self.style.ERROR(f'  - {failure}'))
            raise CommandError(
                f'etl_v2 --verify failed: {len(failures)} violation(s): '
                + '; '.join(failures)
            )
        self.stdout.write(self.style.SUCCESS(
            'VERIFY PASSED — all invariants green.'
        ))
