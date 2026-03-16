#!/bin/bash

# Firehose API Setup Script
# Handles macOS LibreSSL TLS compatibility issues

set -e

MGMT_KEY="${FIREHOSE_MANAGEMENT_KEY:-fhm_j44D2QQqW0RlSoFRfnZelxKkjjuORRSjOtYWhSWb}"
API_BASE="https://api.firehose.com/v1"

echo "════════════════════════════════════════════════════════"
echo "Firehose API Setup - FAS Motorsports Brand Monitoring"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if we have a newer curl (from Homebrew)
if command -v /opt/homebrew/bin/curl &> /dev/null; then
    CURL_CMD="/opt/homebrew/bin/curl"
    echo "✓ Using Homebrew curl (better TLS support)"
elif command -v /usr/local/bin/curl &> /dev/null; then
    CURL_CMD="/usr/local/bin/curl"
    echo "✓ Using Homebrew curl (better TLS support)"
else
    CURL_CMD="curl"
    echo "⚠ Using system curl (may have TLS issues)"
    echo "  Consider installing: brew install curl"
fi

echo ""

# Function to make API requests
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        $CURL_CMD -s -X "$method" \
            -H "Authorization: Bearer $MGMT_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${API_BASE}${endpoint}"
    else
        $CURL_CMD -s -X "$method" \
            -H "Authorization: Bearer $MGMT_KEY" \
            "${API_BASE}${endpoint}"
    fi
}

# Command handling
case "${1:-help}" in
    test)
        echo "Testing API connectivity..."
        echo ""
        response=$(api_request GET /taps 2>&1)

        if [ $? -eq 0 ]; then
            echo "✓ Successfully connected to Firehose API"
            echo ""
            echo "Response:"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
        else
            echo "✗ Failed to connect"
            echo ""
            echo "Error:"
            echo "$response"
            echo ""
            echo "Suggestions:"
            echo "1. Install Homebrew curl: brew install curl"
            echo "2. Check management key is valid"
            echo "3. Try from a different network/environment"
        fi
        ;;

    list)
        echo "Fetching existing taps..."
        echo ""
        response=$(api_request GET /taps)
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    create)
        echo "Creating FAS Motorsports monitoring tap..."
        echo ""

        # Lucene query for FAS Motorsports
        query='"FAS Motorsports" OR "fasmotorsports.com" OR "FAS Performance" OR "FAS Racing" OR (FAS AND (motorsports OR performance OR racing OR automotive))'

        tap_data=$(cat <<EOF
{
  "name": "FAS Motorsports Brand Monitor",
  "query": $query,
  "description": "Real-time monitoring of FAS Motorsports brand mentions across the web"
}
EOF
)

        response=$(api_request POST /taps "$tap_data")
        echo "$response" | jq '.' 2>/dev/null || echo "$response"

        # Extract tap ID if successful
        tap_id=$(echo "$response" | jq -r '.id // .tap_id // empty' 2>/dev/null)

        if [ -n "$tap_id" ]; then
            echo ""
            echo "════════════════════════════════════════════════════════"
            echo "✓ Tap created successfully!"
            echo "════════════════════════════════════════════════════════"
            echo ""
            echo "Tap ID: $tap_id"
            echo ""
            echo "Next steps:"
            echo "  1. View tap details:   ./scripts/firehose-setup.sh details $tap_id"
            echo "  2. Start monitoring:   ./scripts/firehose-setup.sh stream $tap_id"
            echo ""
        fi
        ;;

    details)
        tap_id="${2}"
        if [ -z "$tap_id" ]; then
            echo "Error: Tap ID required"
            echo "Usage: $0 details <tap-id>"
            exit 1
        fi

        echo "Fetching tap details..."
        echo ""
        response=$(api_request GET "/taps/$tap_id")
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    stream)
        tap_id="${2}"
        if [ -z "$tap_id" ]; then
            echo "Error: Tap ID required"
            echo "Usage: $0 stream <tap-id>"
            exit 1
        fi

        echo "Connecting to SSE stream for tap: $tap_id"
        echo "Press Ctrl+C to stop"
        echo ""
        echo "════════════════════════════════════════════════════════"
        echo ""

        # Stream using curl's --no-buffer option
        $CURL_CMD -N -H "Authorization: Bearer $MGMT_KEY" \
            "${API_BASE}/stream/${tap_id}" | while IFS= read -r line; do
            if [[ $line == data:* ]]; then
                data="${line#data: }"
                echo "═══════════════════════════════════════════════════════"
                echo "🔥 NEW MATCH DETECTED"
                echo "═══════════════════════════════════════════════════════"
                echo "$data" | jq -r '
                    "URL: \(.url)",
                    "Title: \(.title // "N/A")",
                    "Domain: \(.domain)",
                    "Published: \(.publish_time // .published // "Unknown")",
                    "Snippet: \((.snippet // .added // "N/A") | if length > 300 then .[0:300] + "..." else . end)"
                ' 2>/dev/null || echo "$data"
                echo "═══════════════════════════════════════════════════════"
                echo ""
            fi
        done
        ;;

    help|*)
        cat <<EOF
Firehose Brand Monitoring - FAS Motorsports

Usage:
  $0 <command> [options]

Commands:
  test              Test API connectivity
  create            Create new FAS Motorsports monitoring tap
  list              List all existing taps
  details <tap-id>  Get details for a specific tap
  stream <tap-id>   Connect to SSE stream and monitor matches
  help              Show this help message

Examples:
  $0 test
  $0 create
  $0 list
  $0 stream abc123

Environment:
  FIREHOSE_MANAGEMENT_KEY: ${MGMT_KEY:0:10}...

Requirements:
  - jq (for JSON parsing): brew install jq
  - curl with modern TLS: brew install curl (optional but recommended)

Documentation:
  https://firehose.com/api-docs
EOF
        ;;
esac
