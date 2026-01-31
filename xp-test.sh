#!/bin/bash

# XP System Quick Test Script
# This script tests the XP system end-to-end

echo "================================"
echo "  XP System Quick Test"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${YELLOW}[1/5] Checking if backend is running on port 8080...${NC}"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is NOT running. Start it first:${NC}"
    echo "   cd server && mvn spring-boot:run"
    exit 1
fi
echo ""

# Check if frontend is running
echo -e "${YELLOW}[2/5] Checking if frontend is running on port 5173...${NC}"
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running. Start it first:${NC}"
    echo "   cd client && npm run dev"
    exit 1
fi
echo ""

# Check MongoDB connection
echo -e "${YELLOW}[3/5] Checking MongoDB connection...${NC}"
if mongo studencollabfin --eval "db.adminCommand('ping')" &>/dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}✗ MongoDB is NOT running${NC}"
fi
echo ""

# Check WebSocket endpoint
echo -e "${YELLOW}[4/5] Checking WebSocket endpoint...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ws-studcollab)
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo -e "${GREEN}✓ WebSocket endpoint is accessible${NC}"
else
    echo -e "${RED}✗ WebSocket endpoint error (HTTP $response)${NC}"
fi
echo ""

# Check if GamificationService exists
echo -e "${YELLOW}[5/5] Checking if GamificationService is compiled...${NC}"
if [ -f "server/target/classes/com/studencollabfin/server/service/GamificationService.class" ]; then
    echo -e "${GREEN}✓ GamificationService is compiled${NC}"
else
    echo -e "${RED}✗ GamificationService is NOT compiled${NC}"
    echo "   Run: cd server && mvn clean compile"
fi
echo ""

echo "================================"
echo -e "${GREEN}All systems ready!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in browser"
echo "2. Login to your account"
echo "3. Open DevTools (F12) → Console tab"
echo "4. Filter for: [useXpWs], [XPProgressBar]"
echo "5. Create a post and watch the logs"
echo ""
echo "Expected output:"
echo "  - Backend logs: '🎯 [GamificationService]' messages"
echo "  - Frontend logs: '✅ [useXpWs] WebSocket connected!'"
echo "  - Progress bar should animate from 0% to 15%"
echo ""
