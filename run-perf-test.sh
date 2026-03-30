#!/bin/bash

BASE_URL="http://localhost:3000"
USERNAME="Admin" # You need to use your admin's username
PASSWORD="ITCS2581234" # You need to use your admin's password

echo "--- Performance Test with Autocannon ---"

# 1. Login to get token
echo "1. Getting Auth Token..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 10 ]; then
    echo "❌ Login Failed. Token empty."
    exit 1
fi
echo "✅ Token acquired."

# 2. Run Autocannon
echo ""
echo "2. Running Autocannon (10s duration)..."
echo "Target: $BASE_URL/rooms"
echo ""

# Using npx to run autocannon without global install requirement
# -c 100: 100 concurrent connections
# -d 10: 10 seconds duration
npx autocannon -c 100 -d 20 -H "Authorization: Bearer $TOKEN" "$BASE_URL/rooms "