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
CURL_CMD=""

# Prefer Homebrew curl if installed via formula path
if command -v brew &> /dev/null; then
    BREW_CURL_PREFIX="$(brew --prefix curl 2>/dev/null || true)"
    if [ -n "$BREW_CURL_PREFIX" ] && [ -x "$BREW_CURL_PREFIX/bin/curl" ]; then
        CURL_CMD="$BREW_CURL_PREFIX/bin/curl"
    fi
fi

# Fallback to common Homebrew binary locations
if [ -z "$CURL_CMD" ]; then
    for candidate in /opt/homebrew/bin/curl /usr/local/bin/curl /opt/homebrew/opt/curl/bin/curl /usr/local/opt/curl/bin/curl; do
        if [ -x "$candidate" ]; then
            CURL_CMD="$candidate"
            break
        fi
    done
fi

# Final fallback to whatever is on PATH
if [ -z "$CURL_CMD" ]; then
    CURL_CMD="$(command -v curl || true)"
fi

if [ -n "$CURL_CMD" ] && [ "$CURL_CMD" != "/usr/bin/curl" ]; then
    echo "✓ Using Homebrew curl (better TLS support)"
    echo "  Path: $CURL_CMD"
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

    local args=(
        -sS
        --fail-with-body
        -X "$method"
        -H "Authorization: Bearer $MGMT_KEY"
    )

    if [ -n "$data" ]; then
        args+=(
            -H "Content-Type: application/json"
            -d "$data"
        )
    fi

    args+=("${API_BASE}${endpoint}")
    "$CURL_CMD" "${args[@]}"
}

# Function to build JSON payloads safely
build_tap_payload() {
    local name="$1"
    local query="$2"
    local description="$3"

    if command -v jq >/dev/null 2>&1; then
        jq -n \
            --arg name "$name" \
            --arg query "$query" \
            --arg description "$description" \
            '{name: $name, query: $query, description: $description}'
    else
        # Fallback when jq is unavailable (query is static so quoting is safe here)
        cat <<EOF
{
  "name": "$name",
  "query": "$query",
  "description": "$description"
}
EOF
    fi
}

# Command handling
case "${1:-help}" in
    test)
        echo "Testing API connectivity..."
        echo ""
        if response="$(api_request GET /taps 2>&1)"; then
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
        if ! response="$(api_request GET /taps 2>&1)"; then
            echo "✗ Failed to fetch taps"
            echo ""
            echo "Error:"
            echo "$response"
            exit 1
        fi
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    create)
        echo "Creating FAS Motorsports monitoring tap..."
        echo ""

        # Lucene query for FAS Motorsports
        query='"FAS Motorsports" OR "fasmotorsports.com" OR "FAS Performance" OR "FAS Racing" OR (FAS AND (motorsports OR performance OR racing OR automotive))'
        tap_data="$(build_tap_payload \
            "FAS Motorsports Brand Monitor" \
            "$query" \
            "Real-time monitoring of FAS Motorsports brand mentions across the web")"

        if ! response="$(api_request POST /taps "$tap_data" 2>&1)"; then
            echo "✗ Failed to create tap"
            echo ""
            echo "Error:"
            echo "$response"
            echo ""
            echo "Troubleshooting:"
            echo "1. Verify FIREHOSE_MANAGEMENT_KEY is valid"
            echo "2. Confirm API endpoint and network access"
            echo "3. Retry using: ./scripts/firehose-setup.sh test"
            exit 1
        fi

        echo "$response" | jq '.' 2>/dev/null || echo "$response"

        # Extract tap ID if successful (supports legacy and nested response formats)
        tap_id=$(echo "$response" | jq -r '.id // .tap_id // .data.id // .data.tap_id // empty' 2>/dev/null)

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
        if ! response="$(api_request GET "/taps/$tap_id" 2>&1)"; then
            echo "✗ Failed to fetch tap details"
            echo ""
            echo "Error:"
            echo "$response"
            exit 1
        fi
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
