# F2-08 — Critical-Path Coverage Backfill (Phase 2 QA gate prep)

**Agent**: Test Engineer · **Branch**: `rework/v2` (HEAD `41692bd`) · **Date**: 2026-10-05
**Suite**: `portfolio_api` — pytest per `pytest.ini` (`--cov=projects --cov=portfolio_api`, `term-missing`)

## Before / After (per-file, `projects/`)

| File | Before | After | Δ |
|---|---|---|---|
| `consumers.py` | **49%** (65 miss) | **99%** (1 miss) | +50 |
| `storage.py` | **36%** (25 miss) | **100%** | +64 |
| `views.py` | **86%** (22 miss) | **100%** | +14 |
| `serializers.py` | 99% (1 miss) | **100%** | +1 |
| `models.py` | 94% (8 miss) | **100%** | +6 |
| `routing.py` | **0%** (3 miss) | **100%** | +100 |
| `projects/` TOTAL | 85% (189 miss) | **95%** (66 miss) | +10 |

Suite: **297 → 354 passed** (+57), runtime ~11s. Remaining misses: `consumers.py:165` (documented below) + etl_v2/migration long-tail (out of scope, heavily tested where it matters).

## Tests added (name → path guarded)

### `tests/integration/test_terminal_consumer.py` (29 tests)
The WS proxy — the file with the token-dropping history:

- `TestValidateJwtBranches` (6) → every `validate_jwt` accept/reject branch: valid, wrong purpose, missing exp, expired, malformed, unexpected decode error fails **closed**
- `TestConnectAuthGate` (4) → missing/malformed/expired/wrong-purpose token each close **4003** with the upstream **never dialed** (fake `websockets.connect` asserts)
- `TestConnectUpstreamUrl` (4) → ws:// and wss:// passthrough, scheme-less base URL gets `wss://` prefix, slug taken from the route
- `TestConnectDialFailures` (2) → dial error → user-visible output + close; 180s dial timeout → timeout message + close (asserted at the `asyncio.wait_for` boundary — no real 180s sleep)
- `TestConnectedProxyFlow` (2) → one full session against a fake upstream: welcome message, upstream→browser relay, browser→upstream input forwarded verbatim, disconnect closes upstream + cancels forwarding task; upstream close-error during cleanup swallowed
- `TestReceivePaths` (2) → upstream dead on send → "refresh" notice; receive-before-dial → silent no-op
- `TestForwardFromTerminal` (5) → upstream ConnectionClosed → "closed, refresh" notice + browser close; both-ends-dead notify failure swallowed; transport error → error notice; read-idle → keepalive ping + "still active" notice
- `TestHealthCheckConsumer` (1) → handshake body + close
- `TestRoutingTable` (3) → exactly 2 WS routes; terminal route extracts `project_slug`; health route registered

### `tests/integration/test_storage_urls.py` (12 tests)
- `url()` happy path delegates to `S3Boto3Storage` parent (stubbed — no boto3/network)
- dotted bucket name (`media.aouichou.me.s3.amazonaws.com`) normalized to first label **before** parent builds URL (the hostname-corruption bug)
- parent failure → external fallback `https://s3.{region}.amazonaws.com/...` — never raises into the view; region defaults to `eu-west-1` when unset
- `exists()` always False; ACL stripped from object params (bucket-owner-enforced); params untouched when no ACL
- `_normalize_name` collapses `//`
- `get_storage()`/`LazyStorage`: DEBUG→FileSystemStorage, prod→CustomS3Storage

### `tests/integration/test_views_residual_branches.py` (16 tests)
- `TestValidateDomainMatrix` (5) → the DNS resolver matrix via a stubbed `dns.resolver.Resolver`: MX ok; MX-miss→A fallback ok; both miss → reject; `LifetimeTimeout` → fail-open allow; unexpected error → fail-open allow
- `TestGenerateTerminalTokenBranches` (2) → **authenticated** payload (user_id/username) vs **anonymous guest** payload (user_id None, username 'guest'), both purpose-scoped HS256
- `TestProjectFilesStorageFailure` (1) → S3 URL failure → clean 500 `{'error': ...}` (pre-contract shape pinned as-is)
- Residual model/serializer closes: `Experience.save` slug auto-gen + dedup (-1 suffix) + preserved; `Project.clean` slug-gen, duplicate-slug reject, internship-without-experience reject; `Project.save` auto-slug (models.py:250 — `make_project` pre-sets slug so the branch was dark); `GalleryImage.__str__`; `GalleryImageSerializer.image_url` → None when no image (serializers.py:65)

## Documented skips (in-file, `test_storage_urls.py` tail)

1. **`consumers.py:165`** (`"Forward task cancelled"` log) — success path of `await self.forward_task` after `cancel()`, reachable only when the task completes between the `done()` check and cancellation delivery. An event-loop race; forcing it needs asyncio-internals instrumentation. The `CancelledError` sibling (line 166) **is** covered.
2. **The real 180s dial timeout** — asserted at the `asyncio.wait_for` stub boundary instead; actually sleeping 180s is not a fast deterministic test.

## Constraints honored

- Zero network: upstream WS, boto3/R2, and DNS resolver all faked/mocked per existing patterns (`test_security_hotfixes.py` fake-upstream idiom, `asyncio.run` — pytest-asyncio not in deps)
- Behavior assertions only: close codes (4003/1011), relayed payloads, side effects (upstream closed, task done) — no internal-call assertions
- Existing suites untouched; duplication avoided (auth-gate secret tests, contact SMTP-failure, token shape/throttle already covered — verified before writing)

## Evidence

```
$ .venv/bin/python -m pytest --cov=projects --cov-report=term-missing -q
====================== 354 passed, 22 warnings in 11.10s ======
projects/consumers.py    127   1   99%   165
projects/models.py       129   0  100%
projects/routing.py        3   0  100%
projects/serializers.py   84   0  100%
projects/storage.py       39   0  100%
projects/views.py        161   0  100%
TOTAL                   1254  66   95%
```

## Codacy note

Codacy MCP tools were not available in this session — test-only changes, no dependency adds. If analysis is wanted, see the Codacy extension troubleshooting steps (reset MCP / Copilot MCP settings).
