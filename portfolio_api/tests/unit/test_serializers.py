# tests/unit/test_serializers.py
"""Unit tests for serializer helper functions and serializer field validation."""

import pytest
from projects.serializers import validate_code_snippets, validate_code_steps

# ═════════════════════════════════════════════════════════════════════════════
# validate_code_steps
# ═════════════════════════════════════════════════════════════════════════════

class TestValidateCodeSteps:

    def test_returns_empty_dict_for_non_dict_input(self):
        assert validate_code_steps([]) == {}
        assert validate_code_steps('text') == {}
        assert validate_code_steps(None) == {}

    def test_unwraps_single_key_0_wrapper(self):
        wrapped = {'0': {'step1': 'compile', 'step2': 'run'}}
        result = validate_code_steps(wrapped)
        assert result == {'step1': 'compile', 'step2': 'run'}

    def test_does_not_unwrap_multi_key_dict(self):
        data = {'0': 'a', '1': 'b'}
        result = validate_code_steps(data)
        assert result == {'0': 'a', '1': 'b'}

    def test_converts_dict_values_to_str(self):
        data = {'step': {'nested': 'value'}}
        result = validate_code_steps(data)
        assert isinstance(result['step'], str)

    def test_converts_list_values_to_str(self):
        data = {'step': ['a', 'b']}
        result = validate_code_steps(data)
        assert isinstance(result['step'], str)

    def test_preserves_string_values(self):
        data = {'step1': 'make re', 'step2': './minishell'}
        result = validate_code_steps(data)
        assert result == {'step1': 'make re', 'step2': './minishell'}


# ═════════════════════════════════════════════════════════════════════════════
# validate_code_snippets
# ═════════════════════════════════════════════════════════════════════════════

class TestValidateCodeSnippets:

    def test_returns_empty_dict_for_non_dict_input(self):
        assert validate_code_snippets([]) == {}
        assert validate_code_snippets('text') == {}
        assert validate_code_snippets(None) == {}

    def test_converts_old_string_format_to_new(self):
        data = {'main': '#include <stdio.h>'}
        result = validate_code_snippets(data)
        assert result['main']['code'] == '#include <stdio.h>'
        assert result['main']['language'] == 'c'
        assert 'title' in result['main']

    def test_preserves_new_format_with_all_fields(self):
        snippet = {
            'code': 'int main() {}',
            'title': 'Main',
            'description': 'Entry point',
            'explanation': 'Main function',
            'language': 'c',
        }
        data = {'main': snippet}
        result = validate_code_snippets(data)
        assert result['main'] == snippet

    def test_fills_missing_fields_in_new_format(self):
        snippet = {'code': 'int x = 0;'}
        result = validate_code_snippets({'var': snippet})
        assert result['var']['title'] != ''
        assert result['var']['language'] == 'c'

    def test_ignores_keys_without_code_in_dict_format(self):
        data = {'no_code': {'description': 'only description'}}
        result = validate_code_snippets(data)
        # Should return empty dict because there's no 'code' key
        assert result == {}

    def test_title_generated_from_key_name(self):
        data = {'parse_input': 'some code'}
        result = validate_code_snippets(data)
        assert result['parse_input']['title'] == 'Parse Input'
