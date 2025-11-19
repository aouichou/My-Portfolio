#!/usr/bin/env bash
# Test the development environment setup
# Run this to verify everything is working correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Development Environment${NC}\n"

# Test 1: Docker running
echo -n "Testing Docker... "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Docker not running${NC}"
    exit 1
fi

# Test 2: Containers running
echo -n "Testing containers... "
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓${NC}"
    CONTAINERS_UP=true
else
    echo -e "${YELLOW}⚠ Containers not running (use ./scripts/dev-setup.sh)${NC}"
    CONTAINERS_UP=false
fi

if [ "$CONTAINERS_UP" = true ]; then
    # Test 3: Frontend responding
    echo -n "Testing frontend (localhost:3000)... "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302\|304"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test 4: Backend responding
    echo -n "Testing backend (localhost:8000)... "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 | grep -q "200\|301\|302\|404"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test 5: Database accessible
    echo -n "Testing database... "
    if docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test 6: Redis accessible
    echo -n "Testing Redis... "
    if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Test 7: Terminal service
    echo -n "Testing terminal service (localhost:8001)... "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 | grep -q "200\|404"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi

    # Summary
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    echo -e "\n${BLUE}Services:${NC}"
    echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
    echo -e "  Backend:   ${GREEN}http://localhost:8000${NC}"
    echo -e "  Admin:     ${GREEN}http://localhost:8000/admin${NC}"
    echo -e "  Terminal:  ${GREEN}ws://localhost:8001${NC}"
else
    echo -e "\n${YELLOW}Start services with:${NC}"
    echo -e "  ./scripts/dev-setup.sh"
    echo -e "  # or"
    echo -e "  docker-compose -f docker-compose.dev.yml up"
fi
