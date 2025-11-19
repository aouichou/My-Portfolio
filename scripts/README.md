# Development Scripts

This directory contains helper scripts for local development.

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
