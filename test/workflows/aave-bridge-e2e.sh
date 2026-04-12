#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

# End-to-end test: Aave action via standalone bridge server.
#
# Requires:
#   - w3 CLI built (with bridge serve command)
#   - Node.js 24+
#   - Internet access (Sepolia RPC)
#
# Usage:
#   W3_CLI=/path/to/w3 ./test/workflows/aave-bridge-e2e.sh
#   # Or with custom RPC:
#   W3_CLI=/path/to/w3 SEPOLIA_RPC=https://... ./test/workflows/aave-bridge-e2e.sh

W3_CLI="${W3_CLI:-../../protocol/target/debug/w3}"
# Default: W3_HTTP_PORT - 1 (matches bridge serve's own default)
BRIDGE_PORT="${BRIDGE_PORT:-$(( ${W3_HTTP_PORT:-8233} - 1 ))}"
SEPOLIA_RPC="${SEPOLIA_RPC:-https://eth-sepolia.g.alchemy.com/v2/0L3k1EjL5mpti6pqRUi1y}"

echo "=== Aave V3 Bridge E2E Test ==="
echo "  Bridge CLI: $W3_CLI"
echo "  Port: $BRIDGE_PORT"
echo "  RPC: ${SEPOLIA_RPC:0:50}..."
echo ""

# Start bridge server in background
echo "[1/5] Starting bridge server..."
W3_CHAIN_RPC_ETHEREUM_SEPOLIA="$SEPOLIA_RPC" \
  "$W3_CLI" bridge serve --port "$BRIDGE_PORT" &
BRIDGE_PID=$!

# Wait for bridge to be ready
sleep 2
if ! kill -0 "$BRIDGE_PID" 2>/dev/null; then
  echo "FAIL: Bridge server died on startup"
  exit 1
fi

# Verify health
if curl -sf "http://localhost:$BRIDGE_PORT/health" > /dev/null; then
  echo "  Bridge is healthy"
else
  echo "FAIL: Bridge health check failed"
  kill "$BRIDGE_PID" 2>/dev/null || true
  exit 1
fi

cleanup() {
  echo ""
  echo "Stopping bridge server (PID $BRIDGE_PID)..."
  kill "$BRIDGE_PID" 2>/dev/null || true
  wait "$BRIDGE_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Test 1: get-reserves-list (read-only, no signer needed)
echo ""
echo "[2/5] Testing get-reserves-list..."
RESULT=$(W3_BRIDGE_URL="http://localhost:$BRIDGE_PORT" \
  INPUT_COMMAND=get-reserves-list \
  INPUT_NETWORK=ethereum-sepolia \
  node dist/index.js 2>&1 || true)

if echo "$RESULT" | grep -q "0xFF34B3d4"; then
  echo "  PASS: Got reserve addresses from Aave Pool"
else
  echo "  FAIL: Expected reserve addresses"
  echo "  Output: $RESULT"
  exit 1
fi

# Test 2: get-asset-price (USDC)
echo ""
echo "[3/5] Testing get-asset-price (USDC)..."
RESULT=$(W3_BRIDGE_URL="http://localhost:$BRIDGE_PORT" \
  INPUT_COMMAND=get-asset-price \
  INPUT_NETWORK=ethereum-sepolia \
  INPUT_ASSET="0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" \
  node dist/index.js 2>&1 || true)

if echo "$RESULT" | grep -q "100000000"; then
  echo "  PASS: USDC price is \$1.00 (100000000)"
else
  echo "  FAIL: Expected USDC price"
  echo "  Output: $RESULT"
  exit 1
fi

# Test 3: get-position (Aave deployer address)
echo ""
echo "[4/5] Testing get-position..."
RESULT=$(W3_BRIDGE_URL="http://localhost:$BRIDGE_PORT" \
  INPUT_COMMAND=get-position \
  INPUT_NETWORK=ethereum-sepolia \
  INPUT_USER="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  node dist/index.js 2>&1 || true)

if echo "$RESULT" | grep -q "result"; then
  echo "  PASS: Got user position data"
else
  echo "  FAIL: Expected position data"
  echo "  Output: $RESULT"
  exit 1
fi

# Test 4: get-reserve-config (USDC)
echo ""
echo "[5/5] Testing get-reserve-config (USDC)..."
RESULT=$(W3_BRIDGE_URL="http://localhost:$BRIDGE_PORT" \
  INPUT_COMMAND=get-reserve-config \
  INPUT_NETWORK=ethereum-sepolia \
  INPUT_ASSET="0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" \
  node dist/index.js 2>&1 || true)

if echo "$RESULT" | grep -q "true\|8000\|8500"; then
  echo "  PASS: Got USDC reserve config"
else
  echo "  FAIL: Expected reserve config"
  echo "  Output: $RESULT"
  exit 1
fi

echo ""
echo "=== All E2E tests passed ==="
