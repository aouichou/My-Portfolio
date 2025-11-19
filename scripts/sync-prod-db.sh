#!/usr/bin/env bash
# Sync Production Database to Local Development
# This script pulls the production database from Render and imports it locally

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Syncing Production Database to Local${NC}\n"

# Check if required env vars are set
if [ -z "$RENDER_SERVICE_ID" ] || [ -z "$RENDER_API_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    echo -e "   RENDER_SERVICE_ID - Your Render backend service ID"
    echo -e "   RENDER_API_KEY - Your Render API key"
    echo -e "\n${YELLOW}To find these:${NC}"
    echo -e "   1. Go to https://dashboard.render.com/"
    echo -e "   2. Select your portfolio-api service"
    echo -e "   3. Service ID is in the URL and service info"
    echo -e "   4. API key: Account Settings > API Keys"
    echo -e "\n${YELLOW}Set them with:${NC}"
    echo -e "   export RENDER_SERVICE_ID='srv-xxxxx'"
    echo -e "   export RENDER_API_KEY='rnd_xxxxx'"
    exit 1
fi

# Confirm action
echo -e "${YELLOW}⚠️  WARNING: This will replace your local development database!${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 0
fi

# Create backup of current local DB (optional)
echo -e "\n${GREEN}📦 Creating backup of local database...${NC}"
BACKUP_FILE="backups/local-db-backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p backups

docker-compose -f docker-compose.dev.yml exec -T db pg_dump -U postgres portfolio_dev > "$BACKUP_FILE" 2>/dev/null || true
echo -e "${GREEN}✓ Local backup saved to: $BACKUP_FILE${NC}"

# Get database URL from Render
echo -e "\n${GREEN}🔍 Fetching database credentials from Render...${NC}"
DB_INFO=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$RENDER_SERVICE_ID/env-vars" | \
    jq -r '.[] | select(.key == "DATABASE_URL") | .value')

if [ -z "$DB_INFO" ] || [ "$DB_INFO" = "null" ]; then
    echo -e "${RED}❌ Failed to fetch database URL from Render${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database credentials retrieved${NC}"

# Parse database URL
# Format: postgresql://user:pass@host:port/dbname
DB_USER=$(echo "$DB_INFO" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DB_INFO" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_INFO" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_INFO" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_INFO" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Dump production database
echo -e "\n${GREEN}📥 Dumping production database...${NC}"
PROD_DUMP="backups/prod-db-dump-$(date +%Y%m%d-%H%M%S).sql"

PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists > "$PROD_DUMP"

echo -e "${GREEN}✓ Production database dumped to: $PROD_DUMP${NC}"

# Drop and recreate local database
echo -e "\n${GREEN}🗑️  Dropping local database...${NC}"
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS portfolio_dev;"
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "CREATE DATABASE portfolio_dev;"

# Import production dump
echo -e "\n${GREEN}📤 Importing production data to local database...${NC}"
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d portfolio_dev < "$PROD_DUMP"

echo -e "\n${GREEN}✅ Database sync complete!${NC}"

# Run any pending migrations
echo -e "\n${GREEN}🔄 Running migrations...${NC}"
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Create a local superuser if needed
echo -e "\n${YELLOW}💡 TIP: You may want to create a local superuser for testing${NC}"
read -p "Create local superuser now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
fi

echo -e "\n${GREEN}🎉 Production database successfully synced to local!${NC}"
echo -e "\n${YELLOW}Backups saved:${NC}"
echo -e "  Local backup:  $BACKUP_FILE"
echo -e "  Prod dump:     $PROD_DUMP"

echo -e "\n${BLUE}Access your local services:${NC}"
echo -e "  Frontend:  http://localhost:3000"
echo -e "  Backend:   http://localhost:8000"
echo -e "  Admin:     http://localhost:8000/admin"
