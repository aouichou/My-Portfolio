# tests/unit/test_serializers.py
"""
Unit tests for the schema v2 serializer surface.

The v1 read-time shape-mutating validators (validate_code_snippets /
validate_code_steps) were deleted in F1-06 (field map §5.3 — the
double-transform hazard); canonicalization happens at ETL/write time (F1-07).
These tests pin the serializer as a pass-through for canonical JSON content.
"""

import pytest
from projects.serializers import ProjectSerializer

from tests.conftest import make_project

# ═════════════════════════════════════════════════════════════════════════════
# ProjectSerializer — pass-through contract (field map §5.3)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestSerializerPassThrough:

    def test_read_returns_model_content_verbatim(self):
        steps = ['make re', './minishell']
        snippets = [{'title': 'Main', 'language': 'c', 'code': 'int main(void){}'}]
        p = make_project(code_steps=steps, code_snippets=snippets)
        data = ProjectSerializer(p).data
        assert data['code_steps'] == steps
        assert data['code_snippets'] == snippets

    def test_write_validates_canonical_to_itself(self):
        steps = ['make re', './minishell']
        snippets = [{'title': 'Main', 'language': 'c', 'code': 'int main(void){}'}]
        payload = {
            'title': 'Pass Through',
            'slug': 'pass-through',
            'description': 'd',
            'project_type': 'school',
            'tech_stack': [{'name': 'C'}],
            'code_steps': steps,
            'code_snippets': snippets,
        }
        serializer = ProjectSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data['code_steps'] == steps
        assert serializer.validated_data['code_snippets'] == snippets

    def test_read_serializes_v2_fields(self):
        p = make_project(
            has_demo=True,
            demo_commands=[{'label': 'Build', 'command': 'make'}],
            architecture_description='Layers.',
            order=2,
        )
        data = ProjectSerializer(p).data
        assert data['has_demo'] is True
        assert data['demo_commands'] == [{'label': 'Build', 'command': 'make'}]
        assert data['architecture_description'] == 'Layers.'
        assert data['order'] == 2

    def test_v2_fields_present_in_contract(self):
        """The serializer surface exposes the schema v2 fields the F2-01
        contract will freeze (additive vs v1: has_demo, demo block shape,
        rescued rich-content fields, experience link, timestamps)."""
        expected = {
            'has_demo', 'demo_commands', 'demo_files_path',
            'architecture_description', 'architecture_diagrams',
            'related_documentation', 'order', 'experience',
            'role_description', 'stats', 'badges', 'impact_metrics',
            'created_at', 'updated_at',
        }
        assert expected.issubset(set(ProjectSerializer.Meta.fields))

    def test_dropped_fields_absent_from_contract(self):
        """Fields deleted from the model (map §2.1) must not linger on the
        serialization surface."""
        dropped = {
            'company', 'role', 'start_date', 'end_date',
            'diagram_type', 'architecture_diagram', 'has_interactive_demo',
        }
        assert not dropped & set(ProjectSerializer.Meta.fields)
