# tests/unit/test_validator_f405b.py
"""
F4-05b — validator extensions for the four new demo projects.

The four new demos (ft_ls, ft_select, ft_ping, ft_linear_regression) need
three capabilities beyond the F4-02 validator surface:

1. `&&` chains: `make && ./ft_ls -la` — each segment independently
   validated against the full single-command checks (allowlist, escape
   sequences, traversal, danger list). Any bad segment blocks the line.
2. `./binary` with arguments: `./ft_ls -la`, `./train 0.1 1000 0.0000001`,
   `./ft_ping --help`. Args charset: word chars, `.`, `/`, `-`, `=`, `:`,
   `,` — NO shell metacharacters (whitespace separation only; quotes and
   everything else rejected).
3. Program stdin: when a foreground program (not bash) owns the tty and
   reads a line (e.g. `./predict`'s "Enter a mileage:" prompt), the typed
   line only needs to be a conservative bare number. The rule grants NO
   new shell capability — a bare number as a bash command is a harmless
   not-found error.

Security posture (pinned by these tests):
- every chain segment runs the FULL single-command pipeline — `make && cat
  /etc/passwd` stays blocked; the traversal check now runs BEFORE the
  allowlist, closing the previously documented `cat ../../etc/passwd` gap
- escape/danger checks also run before the allowlist, closing the three
  documented echo gaps (`echo x > /tmp/x`, `echo \`id\``, `echo $(id)`)
- mixed operators still denied: `;`, `||`, `|`, `>`, `<`, backtick, `$()`
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from main import validate_command

# ═════════════════════════════════════════════════════════════════════════════
# F4-05b demo flows — MUST be allowed
# ═════════════════════════════════════════════════════════════════════════════

class TestF405bBuildAndRunChains:

    def test_make_then_run_ft_ls(self):
        assert validate_command('make && ./ft_ls -la') is True

    def test_make_then_run_ft_ls_plain(self):
        assert validate_command('make && ./ft_ls') is True

    def test_make_then_run_ft_select(self):
        # ft_select's usage: ./ft_select file1 file2 ... (items to select)
        assert validate_command('make && ./ft_select README.md Makefile') is True

    def test_make_then_run_ft_ping_help(self):
        assert validate_command('make && ./ft_ping --help') is True

    def test_make_then_run_ft_ping_usage(self):
        assert validate_command('make && ./ft_ping --usage') is True

    def test_make_then_train_default_dataset(self):
        assert validate_command('make && ./train 0.1 100000 0.000000001') is True

    def test_make_then_train_with_dataset_arg(self):
        assert validate_command(
            'make && ./train 0.1 100000 0.000000001 data/data.csv') is True

    def test_make_then_precision(self):
        assert validate_command('make && ./precision') is True

    def test_make_then_predict(self):
        assert validate_command('make && ./predict') is True

    def test_standalone_binary_with_flags(self):
        assert validate_command('./ft_ls -laRt') is True

    def test_standalone_binary_with_flags_and_path(self):
        assert validate_command('./ft_ls -la libft') is True

    def test_plain_make_still_allowed(self):
        assert validate_command('make') is True

    def test_run_executable_no_args_still_allowed(self):
        assert validate_command('./minishell') is True

    def test_run_binary_with_numeric_args(self):
        assert validate_command('./train 0.1 1000 0.000001') is True

    def test_binary_arg_traversal_still_blocked(self):
        assert validate_command('./ft_ls ../../etc') is False


class TestF405bNumericStdin:
    """Bare-number lines (program stdin for ./predict's mileage prompt)."""

    def test_bare_integer(self):
        assert validate_command('240000') is True

    def test_bare_decimal(self):
        assert validate_command('3.14') is True

    def test_negative_number(self):
        assert validate_command('-42') is True

    def test_number_with_operator_still_denied(self):
        assert validate_command('240000; rm -rf /') is False

    def test_number_pipe_still_denied(self):
        assert validate_command('240000 | sh') is False

    def test_hex_not_allowed(self):
        # strictly decimal keeps the surface minimal
        assert validate_command('0x41') is False

    def test_leading_plus_not_allowed(self):
        assert validate_command('+42') is False

    def test_number_with_letters_denied(self):
        assert validate_command('24abc') is False


# ═════════════════════════════════════════════════════════════════════════════
# Chain hardening — one bad segment blocks the line
# ═════════════════════════════════════════════════════════════════════════════

class TestF405bChainHardening:

    def test_chain_segment_traversal_blocked(self):
        assert validate_command('make && cat ../../etc/passwd') is False

    def test_chain_segment_escape_blocked(self):
        assert validate_command('make && docker run -it ubuntu') is False

    def test_chain_segment_dangerous_blocked(self):
        assert validate_command('make && rm -rf /') is False

    def test_semicolon_still_blocked(self):
        assert validate_command('make; cat /etc/passwd') is False

    def test_or_chain_still_blocked(self):
        assert validate_command('make || cat /etc/shadow') is False

    def test_pipe_still_blocked(self):
        assert validate_command('make | sh') is False

    def test_redirect_in_chain_segment(self):
        assert validate_command('make && ls > /tmp/out') is False

    def test_redirect_before_chain(self):
        assert validate_command('ls > out.txt && make') is False

    def test_chain_with_trailing_operator_denied(self):
        assert validate_command('make &&') is False

    def test_empty_leading_segment_denied(self):
        assert validate_command('&& make') is False

    def test_backtick_inside_chain_segment(self):
        assert validate_command('make && echo `id`') is False

    def test_dollar_paren_inside_chain_segment(self):
        assert validate_command('make && echo $(id)') is False

    def test_three_segment_chain_all_good(self):
        assert validate_command(
            'make && ./ft_ls -la && ./ft_ls -l README.md') is True

    def test_three_segment_chain_one_bad(self):
        # NOTE: `cat /etc/shadow` alone stays allowlisted (pre-existing cat
        # pattern surface, harmless in-container: non-root open() fails, env
        # is scrubbed). The bad segment here is traversal — pre-allowlist
        # check blocks it regardless of position in the chain.
        assert validate_command(
            'make && ./ft_ls -la && cat ../../etc/shadow') is False

    def test_three_segment_chain_bad_tail(self):
        assert validate_command('make && ./ft_ls -la && rm -rf /') is False

    def test_chain_segments_whitespace_tolerant(self):
        assert validate_command('make   &&   ./ft_ls') is True

    def test_tab_separated_chain(self):
        assert validate_command('make\t&&\t./ft_ls') is True


# ═════════════════════════════════════════════════════════════════════════════
# Pre-allowlist checks — previously documented gaps, now closed
# ═════════════════════════════════════════════════════════════════════════════

class TestF405bPreAllowlistChecks:

    def test_cat_traversal_now_blocked(self):
        # Was allowed via the cat allowlist pattern — closed by F4-05b
        assert validate_command('cat ../../etc/passwd') is False

    def test_cat_dev_sda_now_blocked(self):
        # Was allowed via the cat pattern — closed by F4-05b
        assert validate_command('cat /dev/sda') is False

    def test_echo_redirect_now_blocked(self):
        # Was the documented echo gap — closed by F4-05b
        assert validate_command('echo x > /tmp/x') is False

    def test_echo_backtick_now_blocked(self):
        # Was the documented echo gap — closed by F4-05b
        assert validate_command('echo `id`') is False

    def test_echo_dollar_paren_now_blocked(self):
        # Was the documented echo gap — closed by F4-05b
        assert validate_command('echo $(whoami)') is False

    def test_ls_to_dev_null_still_blocked(self):
        assert validate_command('ls > /dev/null') is False

    def test_dev_path_plain_line_blocked(self):
        assert validate_command('/dev/sda') is False
