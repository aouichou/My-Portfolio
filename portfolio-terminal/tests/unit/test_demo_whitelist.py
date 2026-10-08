# tests/unit/test_demo_whitelist.py
"""F4-01 — DB-driven demo whitelist: sync semantics against the frozen feed.

The API's has_demo flag is the single source of truth (contract §6:
GET /api/projects/?has_demo=true&limit=100 → {count, next, previous, results}
with §3.1 cards carrying `slug`). These tests pin:

- envelope parsing (happy path, malformed variants, truncation refusal)
- refresh cadence via injected fake sleeper (no real waiting)
- stale-on-failure: a failed refresh keeps the previous snapshot serving
- fail-closed: before the first successful sync the snapshot is EMPTY
- retry backoff on the startup path (empty → first success)
- refresh-on-miss debounce + the just-enabled acceptance path
- endpoint integration: enabled slug passes, disabled slug gets the
  "may not be enabled yet" message
"""

import asyncio
import os
import sys
import time
import unittest.mock as m

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'pexpect', 'boto3', 'psutil']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

import main
from main import parse_demo_feed


def make_feed(slugs, count=None):
    """Contract §3.1/§4.3 envelope: {"count", "next", "previous", "results"}."""
    results = [{'slug': s, 'has_demo': True} for s in slugs]
    return {'count': count if count is not None else len(results),
            'next': None, 'previous': None, 'results': results}


@pytest.fixture
def whitelist():
    """A fresh DemoWhitelist per test — no shared global state."""
    return main.DemoWhitelist()


class Recorder:
    """Fake asyncio.sleep (fake-timer equivalent): records the requested
    delay, then yields to the event loop once. The yield is essential —
    without a suspension point the sync-loop task would run every retry in
    a single scheduling step and starve the test coroutine forever."""

    def __init__(self):
        self.delays = []

    async def __call__(self, delay):
        self.delays.append(delay)
        await asyncio.sleep(0)


# ═════════════════════════════════════════════════════════════════════════════
# Envelope parsing
# ═════════════════════════════════════════════════════════════════════════════

class TestParseDemoFeed:

    def test_happy_path_slugs_lowercased(self):
        body = make_feed(['minishell', 'Push_Swap'])
        assert parse_demo_feed(body) == {'minishell', 'push_swap'}

    def test_empty_results_is_valid_empty_set(self):
        assert parse_demo_feed(make_feed([])) == set()

    def test_non_dict_body_rejected(self):
        assert parse_demo_feed(['minishell']) is None
        assert parse_demo_feed(None) is None

    def test_missing_results_rejected(self):
        assert parse_demo_feed({'count': 1, 'next': None, 'previous': None}) is None

    def test_results_not_a_list_rejected(self):
        assert parse_demo_feed({'results': {'slug': 'minishell'}}) is None

    def test_non_dict_item_rejected(self):
        assert parse_demo_feed({'count': 1, 'results': ['minishell']}) is None

    def test_missing_or_non_string_slug_rejected(self):
        assert parse_demo_feed({'count': 1, 'results': [{'has_demo': True}]}) is None
        assert parse_demo_feed({'count': 1, 'results': [{'slug': 42}]}) is None

    def test_malformed_slug_value_rejected(self):
        """A slug that could never match sanitize_project_slug's format rule
        must not enter the whitelist (defense against a corrupted feed)."""
        bad = make_feed(['../etc'])
        assert parse_demo_feed(bad) is None

    def test_truncated_page_refused(self):
        """count > page length means the whitelist would be partial —
        refuse (None) rather than silently drop enabled demos."""
        body = make_feed(['minishell'], count=2)
        assert parse_demo_feed(body) is None

    def test_count_equal_to_page_accepted(self):
        assert parse_demo_feed(make_feed(['minishell'], count=1)) == {'minishell'}

    def test_missing_count_key_accepted(self):
        """count is optional in practice — absent means trust the page."""
        body = make_feed(['minishell'])
        del body['count']
        assert parse_demo_feed(body) == {'minishell'}


# ═════════════════════════════════════════════════════════════════════════════
# refresh() — success / stale-keep / fail-closed
# ═════════════════════════════════════════════════════════════════════════════

class TestRefresh:

    async def test_success_updates_snapshot_and_timestamp(self, whitelist):
        async def fetch():
            return {'minishell'}
        with m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            assert await whitelist.refresh(reason='startup') is True
        assert whitelist.slugs == {'minishell'}
        assert whitelist.synced is True

    async def test_transport_failure_returns_false(self, whitelist):
        async def boom():
            raise OSError('connection refused')
        with m.patch.object(whitelist, '_fetch_slugs', side_effect=boom):
            assert await whitelist.refresh(reason='startup') is False

    async def test_bad_payload_returns_false(self, whitelist):
        async def fetch():
            return None
        with m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            assert await whitelist.refresh(reason='startup') is False

    async def test_refresh_failure_keeps_stale_snapshot(self, whitelist):
        """Documented tradeoff: stale-yes beats false-negative."""
        async def good():
            return {'minishell', 'philosophers'}
        async def bad():
            raise OSError('api down')

        with m.patch.object(whitelist, '_fetch_slugs', side_effect=good):
            await whitelist.refresh(reason='startup')
        stale_sync = whitelist.last_sync

        with m.patch.object(whitelist, '_fetch_slugs', side_effect=bad):
            ok = await whitelist.refresh(reason='periodic')

        assert ok is False
        assert whitelist.slugs == {'minishell', 'philosophers'}
        assert whitelist.last_sync == stale_sync  # failure is not a "sync"

    async def test_first_sync_failure_leaves_empty(self, whitelist):
        """Fail-closed: no successful sync yet → EMPTY (nothing enabled)."""
        async def bad():
            raise OSError('api down at boot')
        with m.patch.object(whitelist, '_fetch_slugs', side_effect=bad):
            await whitelist.refresh(reason='startup')
        assert whitelist.slugs == set()
        assert whitelist.synced is False


# ═════════════════════════════════════════════════════════════════════════════
# Sync loop — cadence, backoff, fail-closed → first success
# ═════════════════════════════════════════════════════════════════════════════

class TestSyncLoop:

    async def test_startup_failure_retries_with_backoff_then_first_success(self, whitelist):
        """Boot with API down: EMPTY (fail-closed) + doubling backoff until
        the first success lands."""
        rec = Recorder()
        attempts = {'n': 0}

        async def flaky():
            attempts['n'] += 1
            if attempts['n'] < 3:
                raise OSError('api cold start')
            # Fail-closed invariant: at the moment of the first SUCCESS,
            # the two earlier failures must have left the snapshot empty.
            assert whitelist.synced is False
            assert whitelist.slugs == set()
            return {'minishell'}

        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, '_fetch_slugs', side_effect=flaky):
            loop = asyncio.create_task(main.whitelist_sync_loop(sleep=rec))
            deadline = time.monotonic() + 5.0
            while (attempts['n'] < 3 or not rec.delays) and time.monotonic() < deadline:
                await asyncio.sleep(0)
            loop.cancel()
            with pytest.raises(asyncio.CancelledError):
                await loop

        assert attempts['n'] == 3
        assert whitelist.contains('minishell') is True
        # backoff doubled across the two failures: 5s then 10s, then cadence
        assert rec.delays[:2] == [
            main.WHITELIST_RETRY_BACKOFF_SECS,
            main.WHITELIST_RETRY_BACKOFF_SECS * 2,
        ]

    async def test_cadence_after_success(self, whitelist):
        """Post-success refresh waits TERMINAL_WHITELIST_REFRESH_SECS, not
        the backoff interval."""
        rec = Recorder()

        async def fetch():
            return {'minishell'}

        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            loop = asyncio.create_task(main.whitelist_sync_loop(sleep=rec))
            while not rec.delays:
                await asyncio.sleep(0)
            loop.cancel()
            with pytest.raises(asyncio.CancelledError):
                await loop

        assert rec.delays[0] == main.TERMINAL_WHITELIST_REFRESH_SECS

    async def test_periodic_failure_after_success_sleeps_backoff(self, whitelist):
        """Synced once, then failing refreshes: stale set kept, retries on
        the (doubling, capped) backoff schedule."""
        rec = Recorder()
        attempts = {'n': 0}

        async def first_good_then_bad():
            attempts['n'] += 1
            if attempts['n'] == 1:
                return {'minishell'}
            raise OSError('api down mid-life')

        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, '_fetch_slugs',
                            side_effect=first_good_then_bad):
            loop = asyncio.create_task(main.whitelist_sync_loop(sleep=rec))
            while len(rec.delays) < 3:
                await asyncio.sleep(0)
            loop.cancel()
            with pytest.raises(asyncio.CancelledError):
                await loop

        assert whitelist.slugs == {'minishell'}  # stale kept
        # [cadence, backoff, backoff*2]
        assert rec.delays == [
            main.TERMINAL_WHITELIST_REFRESH_SECS,
            main.WHITELIST_RETRY_BACKOFF_SECS,
            main.WHITELIST_RETRY_BACKOFF_SECS * 2,
        ]


# ═════════════════════════════════════════════════════════════════════════════
# refresh_on_miss — the just-enabled case
# ═════════════════════════════════════════════════════════════════════════════

class TestRefreshOnMiss:

    async def test_miss_triggers_forced_refresh_and_accepts(self, whitelist):
        """Admin flips has_demo after our last sync: cache-miss forces one
        refresh, then the slug is accepted."""
        async def fetch():
            return {'minishell', 'philosophers'}
        whitelist.slugs = {'minishell'}
        whitelist.last_sync = 0.0
        whitelist.last_attempt = 0.0

        with m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            assert await whitelist.refresh_on_miss('philosophers') is True
        assert whitelist.contains('philosophers') is True

    async def test_miss_refresh_still_miss_rejects(self, whitelist):
        async def fetch():
            return {'minishell'}
        whitelist.slugs = {'minishell'}
        whitelist.last_sync = 0.0
        whitelist.last_attempt = 0.0

        with m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            assert await whitelist.refresh_on_miss('push_swap') is False

    async def test_debounce_blocks_stampede(self, whitelist):
        """A flood of cache-misses cannot hammer the API: within the debounce
        window no new fetch happens."""
        calls = {'n': 0}

        async def fetch():
            calls['n'] += 1
            return set()
        whitelist.slugs = set()
        whitelist.last_sync = 0.0
        whitelist.last_attempt = 0.0

        with m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            assert await whitelist.refresh_on_miss('a') is False
            assert await whitelist.refresh_on_miss('b') is False
        assert calls['n'] == 1  # second miss answered from debounce


# ═════════════════════════════════════════════════════════════════════════════
# resolve_enabled_slug — endpoint gate semantics
# ═════════════════════════════════════════════════════════════════════════════

class TestResolveEnabledSlug:

    async def test_enabled_slug_passes_without_refresh(self, whitelist):
        whitelist.slugs = {'minishell'}
        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, 'refresh',
                            side_effect=AssertionError('no fetch expected')):
            assert await main.resolve_enabled_slug('Minishell ') == 'minishell'

    async def test_malformed_slug_400_no_refresh(self, whitelist):
        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, 'refresh',
                            side_effect=AssertionError('no fetch expected')):
            with pytest.raises(HTTPException) as exc:
                await main.resolve_enabled_slug('bad slug!')
        assert exc.value.status_code == 400

    async def test_disabled_slug_refreshes_then_rejects_with_message(self, whitelist):
        async def fetch():
            return {'minishell'}
        whitelist.slugs = {'minishell'}
        whitelist.last_sync = 0.0
        whitelist.last_attempt = 0.0

        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            with pytest.raises(HTTPException) as exc:
                await main.resolve_enabled_slug('push_swap')
        assert exc.value.status_code == 403
        assert 'may not be enabled yet' in exc.value.detail

    async def test_just_enabled_slug_accepted_after_refresh(self, whitelist):
        async def fetch():
            return {'minishell', 'philosophers'}
        whitelist.slugs = {'minishell'}
        whitelist.last_sync = 0.0
        whitelist.last_attempt = 0.0

        with m.patch.object(main, 'demo_whitelist', whitelist), \
             m.patch.object(whitelist, '_fetch_slugs', side_effect=fetch):
            slug = await main.resolve_enabled_slug('philosophers')
        assert slug == 'philosophers'
