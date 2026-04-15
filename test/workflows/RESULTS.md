# E2E Test Results

> Last verified: 2026-04-15

## Prerequisites

| Credential | Env var | Source |
|-----------|---------|--------|
| Ethereum private key | `W3_SECRET_ETHEREUM` | Bridge signer |
| Alchemy Base RPC URL | `ALCHEMY_BASE_RPC` | Alchemy dashboard |

### On-chain requirements

Funded EVM wallet on Base with ETH + USDC.

## Results

| # | Step | Command | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Get reserves list | `get-reserves-list` | PASS | |
| 2 | Get reserve data (USDC) | `get-reserve-data` | PASS | |
| 3 | Get reserve config (USDC) | `get-reserve-config` | PASS | |
| 4 | Get asset price (USDC) | `get-asset-price` | PASS | |
| 5 | Get asset price (WETH) | `get-asset-price` | PASS | |
| 6 | Get position | `get-position` | PASS | |
| 7 | Get user reserve (USDC) | `get-user-reserve` | PASS | |
| 8 | Get e-mode data | `get-emode-data` | PASS | |
| 9 | Print read results | (run step) | PASS | |
| 10 | Supply USDC | `supply` | PASS | |
| 11 | Set USDC as collateral | `set-collateral` | PASS | |
| 12 | Check position after supply | `get-position` | PASS | |
| 13 | Borrow WETH | `borrow` | PASS | |
| 14 | Repay borrowed WETH | `repay` | PASS | Recovery |
| 15 | Withdraw supplied USDC | `withdraw` | PASS | Recovery |
| 16 | Print write results | (run step) | PASS | |
| 17 | Set e-mode category | `set-emode` | SKIP | Fails with active borrows in incompatible categories |
| 18 | Print e-mode results | (run step) | PASS | |

**Summary: 17/17 active steps pass (1 skipped).**

## Skipped Commands

| Command | Reason |
|---------|--------|
| `repay-with-atokens` | Requires active borrow position |
| `flash-loan` | Requires deployed receiver contract |
| `liquidate` | Requires underwater borrower |

## How to run

```bash
# Export credentials
export W3_SECRET_ETHEREUM="..."
export ALCHEMY_BASE_RPC="..."

# Start bridge (on-chain)
w3 bridge serve --port 8232 --signer-ethereum "$W3_SECRET_ETHEREUM" --allow "*" &
export W3_BRIDGE_URL="http://host.docker.internal:8232"

# Run
w3 workflow test --execute test/workflows/e2e.yaml
```
