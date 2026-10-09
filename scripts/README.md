# Development Scripts

This directory contains helper scripts for local development.

## Demo-Zip Pipeline (terminal demos — F4-05a)

The terminal service serves per-project demos from a zip in R2:
visitors' sessions download `project-files/<slug>.zip` on first connect.
The pipeline has three deliberate steps — build, upload, enable — so
nothing reaches production storage by accident.

### 1. Build the zip (local, deterministic, never uploads)

```bash
scripts/make_demo_zip.sh <src_dir> <slug>
# e.g. scripts/make_demo_zip.sh ~/Code/minishell minishell
```

- Applies the standard exclusions (`.git`, `__pycache__`, `node_modules`,
  `*.o`, hidden junk, `media/` demo GIFs...) — see the script header for
  the full list; `--extra-exclude GLOB` adds one-offs.
- Deterministic: sorted entries + fixed timestamps ⇒ same tree, same
  bytes (sha256 printed for the report).
- Writes `.demo-zip-staging/<slug>.zip` (git-ignored) and prints size +
  file count + sha256.
- **Layout is load-bearing**: zip root = the session's landing dir, so
  `demo_commands` like `./minishell` must resolve at that root. Build
  from the source dir whose layout matches the commands.
- Self-test: `scripts/make_demo_zip.sh --check` (exclusion + determinism
  assertions; also pinned by `portfolio-terminal/tests/test_demo_zip_pipeline.py`).

### 2. Upload to R2 (explicit, separate)

```bash
docker run --rm \
  -v "$PWD/.demo-zip-staging:/work" \
  -v "$PWD/portfolio_api/scripts:/scripts:ro" \
  --env-file portfolio_api/.env \
  my-portfolio-backend:latest \
  python /scripts/r2_demo_zip.py upload /work/<slug>.zip <slug>
```

- `r2_demo_zip.py` also has `info <slug>`, `ls`, `download <slug> <dest>`
  for verification. Credentials come from the env file and are never
  printed. Overwriting a demo zip is the intended update path (R2 has no
  versioning).
- ⚠️ The token in `portfolio_api/.env` is READ-ONLY (verified 2026-10-09:
  PutObject denied on every prefix). Uploading requires a write-scoped
  R2 token — set it in the env-file pass (or rotate `AWS_*` temporarily).

### 3. Enable the demo (Django admin)

1. Project row: check `has_demo`, set `demo_files_path` =
   `project-files/<slug>.zip`, curate `demo_commands` (run relative to
   the zip root — verify with a live session).
2. The terminal service picks the slug up via the has_demo feed
   (F4-01 DB-driven whitelist; refresh-on-miss means just-enabled demos
   work without a restart).
3. Fresh session check: mint `GET /api/auth/terminal-token/?slug=<slug>`
   → open `ws…/ws/terminal/<slug>/?token=…` → first prompt should appear
   in seconds (the minishell slim zip went 74 MB → 65 KB; fresh-session
   download+extract is instant).

## F4-05b — one-shot upload of all staged zips (needs WRITE token)

Batman: once a write-scoped R2 token is in `portfolio_api/.env`
(replacing the read-only one), this single command uploads every staged
demo zip (minishell + the four F4-05b projects) and verifies each:

```bash
cd /home/amine/Code/My-Portfolio
for slug in minishell ft-ls ft-select ft-ping ft-linear-regression; do
  docker run --rm \
    -v "$PWD/.demo-zip-staging:/work" \
    -v "$PWD/portfolio_api/scripts:/scripts:ro" \
    --env-file portfolio_api/.env \
    my-portfolio-backend:latest \
    python /scripts/r2_demo_zip.py upload /work/$slug.zip $slug || break
done
docker run --rm -v "$PWD/portfolio_api/scripts:/scripts:ro" \
  --env-file portfolio_api/.env my-portfolio-backend:latest \
  python /scripts/r2_demo_zip.py ls
```

Expected sha256s after upload (deterministic builds, 2026-10-09):

| slug | size | sha256 |
|---|---|---|
| minishell | 65,127 B | `5c5b85672773c3b0211d017bf73d2975661e8ab4d4bc522937d1790c464f8a5` |
| ft-ls | 53,571 B | `fe4ef19a2002094c698ae807c1dc69194bba0b448f1e2e6638459c240b2bd2e4` |
| ft-select | 55,127 B | `f0a58dbfd39a7e37951c9649a7e293692af3fa29201c534f9db9f08050ff17dc` |
| ft-ping | 16,636 B | `788ac3f6a4cb221873dd30c6924befaa96fa9df2cdd9007739126d4ecef77ba4` |
| ft-linear-regression | 49,699 B | `2ba9a5302a295344f10163a74377f29c389d8423884bce8f5afa993dfff609a2` |

After upload: enable per-project via Django admin (has_demo +
demo_files_path) — the F4-05b dev rows carry the exact demo_commands to
copy; the prod fixture `projects/fixtures/demos_f405b.json` ships with
has_demo=false for exactly this reason.

## Available Scripts


### `dev-setup.sh`
**Purpose**: First-time setup of local development environment

**Usage**:
```bash
./scripts/dev-setup.sh
```

**What it does**:
- Checks Docker is running
- Creates `.env.dev` from template if missing
- Builds development Docker containers
- Starts all services (database, redis, backend, frontend, terminal)
- Runs database migrations
- Optionally creates superuser
- Imports projects data if available

**When to use**:
- First time setting up the project locally
- After cloning the repository
- When you want a fresh start

---

### `make_demo_zip.sh`
**Purpose**: Build a deterministic, exclusion-filtered demo zip for a
terminal-demo project (see "Demo-Zip Pipeline" above for the full
build → upload → enable recipe)

**Usage**:
```bash
scripts/make_demo_zip.sh <src_dir> <slug> [--extra-exclude GLOB]
scripts/make_demo_zip.sh --check   # self-test
```

**When to use**: adding or refreshing a project's terminal demo zip.


---

### `sync-prod-db.sh`
**Purpose**: Download production database from Render and import to local

**Prerequisites**:
```bash
export RENDER_SERVICE_ID='srv-xxxxx'  # From Render dashboard
export RENDER_API_KEY='rnd_xxxxx'     # From Render account settings
```

**Usage**:
```bash
./scripts/sync-prod-db.sh
```

**What it does**:
- Backs up current local database
- Fetches production database credentials from Render API
- Dumps production PostgreSQL database
- Drops local database
- Imports production data to local
- Runs migrations
- Optionally creates local superuser

**When to use**:
- Testing with real production data
- Debugging production issues locally
- Need up-to-date project/media data
- After major production changes

**Safety features**:
- Creates backup before replacing local DB
- Saves both local backup and prod dump to `backups/`
- Confirmation prompt before replacing database

---

## Getting Render Credentials

### Service ID
1. Go to https://dashboard.render.com/
2. Select your `portfolio-api` service
3. Service ID is in the URL: `https://dashboard.render.com/web/srv-XXXXX`
4. Also visible in service info panel

### API Key
1. Go to https://dashboard.render.com/account
2. Click "API Keys" in left sidebar
3. Create new key or copy existing
4. Store securely (never commit!)

### Setting Credentials
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export RENDER_SERVICE_ID='srv-xxxxxxxxxxxxx'
export RENDER_API_KEY='rnd_xxxxxxxxxxxxxxxxxxxxx'

# Or create a .env file (ignored by git)
echo 'export RENDER_SERVICE_ID="srv-xxxxx"' > .env.render
echo 'export RENDER_API_KEY="rnd_xxxxx"' >> .env.render
source .env.render
```

## Common Workflows

### New Developer Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd My-Portfolio

# 2. Run setup script
./scripts/dev-setup.sh

# 3. Access services
open http://localhost:3000  # Frontend
open http://localhost:8000/admin  # Admin
```

### Daily Development
```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Make changes (hot-reload active)
# Test changes at http://localhost:3000

# Stop when done
docker-compose -f docker-compose.dev.yml down
```

### Testing with Production Data
```bash
# 1. Set Render credentials
export RENDER_SERVICE_ID='srv-xxxxx'
export RENDER_API_KEY='rnd_xxxxx'

# 2. Sync database
./scripts/sync-prod-db.sh

# 3. Test with real data
docker-compose -f docker-compose.dev.yml up
```

### Fresh Start
```bash
# Nuclear option - removes all containers, volumes, images
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a

# Re-run setup
./scripts/dev-setup.sh
```

## Troubleshooting

### Script permission denied
```bash
chmod +x scripts/*.sh
```

### Database connection failed
```bash
# Check services are running
docker-compose -f docker-compose.dev.yml ps

# Restart database
docker-compose -f docker-compose.dev.yml restart db
```

### Render API authentication failed
```bash
# Verify credentials
echo $RENDER_SERVICE_ID
echo $RENDER_API_KEY

# Test API access
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/$RENDER_SERVICE_ID
```

### pg_dump not found (for sync-prod-db.sh)
```bash
# Install PostgreSQL client tools
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql-client

# Arch
sudo pacman -S postgresql
```

## Best Practices

1. **Never commit credentials** - Use environment variables
2. **Backup before sync** - Script does this automatically
3. **Keep dev separate** - Use `.dev.` files for development
4. **Regular syncs** - Sync prod DB weekly for realistic testing
5. **Check logs** - Use `docker-compose logs -f` to debug issues
