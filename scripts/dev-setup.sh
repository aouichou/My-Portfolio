#!/usr/bin/env bash
# Development Environment Setup Script
# This script sets up the local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Portfolio Development Environment Setup${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Check if .env.dev exists
if [ ! -f portfolio_api/.env.dev ]; then
    echo -e "${YELLOW}⚠ Creating .env.dev from template...${NC}"
    cat > portfolio_api/.env.dev << 'EOF'
# Django Development Environment Variables
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,backend,0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:dev_password_change_me@db:5432/portfolio_dev
POSTGRES_DB=portfolio_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_change_me

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Services
TERMINAL_SERVICE_URL=ws://terminal:8000
FRONTEND_URL=http://localhost:3000

# Email (optional for dev)
SMTP_USER=
SMTP_PASSWORD=
ADMIN_EMAIL=dev@localhost

# S3 (optional for dev - uses local media)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=

# Verification
VERIFY_EMAIL_DOMAINS=False
EOF
    echo -e "${GREEN}✓ Created .env.dev${NC}"
fi

# Build and start services
echo -e "\n${GREEN}📦 Building Docker containers...${NC}"
docker-compose -f docker-compose.dev.yml build

echo -e "\n${GREEN}🚀 Starting services...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo -e "\n${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# Run migrations
echo -e "\n${GREEN}🔄 Running database migrations...${NC}"
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Create superuser (optional)
read -p "Do you want to create a superuser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}👤 Creating superuser...${NC}"
    docker-compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
fi

# Import projects data if exists
if [ -f portfolio_api/projects.json ]; then
    echo -e "\n${GREEN}📥 Importing projects data...${NC}"
    docker-compose -f docker-compose.dev.yml exec backend python manage.py import_projects projects.json
fi

echo -e "\n${GREEN}✅ Development environment is ready!${NC}\n"
echo -e "Services:"
echo -e "  ${GREEN}Frontend:${NC}  http://localhost:3000"
echo -e "  ${GREEN}Backend:${NC}   http://localhost:8000"
echo -e "  ${GREEN}Admin:${NC}     http://localhost:8000/admin"
echo -e "  ${GREEN}Terminal:${NC}  ws://localhost:8001"
echo -e "  ${GREEN}Database:${NC}  localhost:5432"
echo -e "  ${GREEN}Redis:${NC}     localhost:6379"

echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  ${GREEN}View logs:${NC}        docker-compose -f docker-compose.dev.yml logs -f"
echo -e "  ${GREEN}Stop services:${NC}    docker-compose -f docker-compose.dev.yml down"
echo -e "  ${GREEN}Restart service:${NC}  docker-compose -f docker-compose.dev.yml restart <service>"
echo -e "  ${GREEN}Run migrations:${NC}   docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate"
echo -e "  ${GREEN}Django shell:${NC}     docker-compose -f docker-compose.dev.yml exec backend python manage.py shell"
echo -e "  ${GREEN}Sync prod DB:${NC}     ./scripts/sync-prod-db.sh"

echo -e "\n${GREEN}Happy coding! 🎉${NC}\n"
