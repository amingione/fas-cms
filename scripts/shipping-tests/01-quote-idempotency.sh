#!/usr/bin/env bash
set -euo pipefail

: "${SANITY_FUNCTIONS_BASE_URL:?Set SANITY_FUNCTIONS_BASE_URL}"
QUOTE_URL="${SANITY_FUNCTIONS_BASE_URL}/.netlify/functions/getShippingQuoteBySkus"

payload='{
  "cart":[{"sku":"TEST-SKU-1","quantity":1}],
  "destination":{
    "addressLine1":"101 Main St",
    "city":"Fort Myers",
    "state":"FL",
    "postalCode":"33919",
    "country":"US"
  },
  "quoteRequestId":"test-req-1",
  "quoteKey":"__AUTO__"
}'

echo "1) First quote call..."
r1="$(curl -sS -X POST "$QUOTE_URL" -H "Content-Type: application/json" -d "$payload")"
echo "$r1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("shipment:", d.get("easyPostShipmentId"), "quoteKey:", d.get("quoteKey"))'
s1="$(echo "$r1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("easyPostShipmentId") or "")')"
k1="$(echo "$r1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("quoteKey") or "")')"

echo "2) Second quote call (same cart/address)..."
payload2="$(echo "$payload" | python3 -c "import sys,json; d=json.load(sys.stdin); d['quoteRequestId']='test-req-2'; d['quoteKey']='$k1'; print(json.dumps(d))")"
r2="$(curl -sS -X POST "$QUOTE_URL" -H "Content-Type: application/json" -d "$payload2")"
echo "$r2" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("shipment:", d.get("easyPostShipmentId"), "quoteKey:", d.get("quoteKey"))'
s2="$(echo "$r2" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("easyPostShipmentId") or "")')"
k2="$(echo "$r2" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("quoteKey") or "")')"

echo
if [[ -z "$s1" || -z "$s2" ]]; then
  echo "FAIL: Missing shipmentId in response"
  exit 1
fi

if [[ "$k1" != "$k2" ]]; then
  echo "FAIL: quoteKey changed between identical inputs ($k1 vs $k2)"
  exit 1
fi

if [[ "$s1" != "$s2" ]]; then
  echo "FAIL: shipmentId changed for identical inputs ($s1 vs $s2)"
  exit 1
fi

echo "PASS: Same quoteKey + same shipmentId reused."
