# W3 Aave V3 Action

Aave V3 lending protocol for W3 workflows.
Supply, borrow, repay, liquidate, flash loans, and read operations across 13 networks.

## Quick start

```yaml
# Read: list all reserves on Ethereum mainnet
- uses: w3-io/w3-aave-action@v1
  with:
    command: get-reserves-list
    network: ethereum

# Write: supply USDC as collateral
- uses: w3-io/w3-aave-action@v1
  with:
    command: supply
    network: ethereum
    asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    amount: '1000000'

# Write: borrow DAI against collateral
- uses: w3-io/w3-aave-action@v1
  with:
    command: borrow
    network: ethereum
    asset: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    amount: '500000000000000000'
    on-behalf-of: '${{ steps.supply.outputs.result.from }}'
```

## Commands

18 commands across 6 categories:

| Category    | Commands                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Lending     | `supply`, `withdraw`, `borrow`, `repay`, `repay-with-atokens`                                                                          |
| Position    | `set-collateral`, `set-emode`, `swap-borrow-rate`                                                                                      |
| Liquidation | `liquidate`                                                                                                                            |
| Flash loans | `flash-loan`                                                                                                                           |
| Read        | `get-position`, `get-reserve-data`, `get-user-reserve`, `get-reserves-list`, `get-asset-price`, `get-reserve-config`, `get-emode-data` |
| Testnet     | `faucet-mint`                                                                                                                          |

See [docs/guide.md](docs/guide.md) for per-command reference.

## Networks

Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB, Gnosis, Scroll, Metis, zkSync, Polygon zkEVM, Ethereum Sepolia (testnet).

## Bridge integration

All on-chain operations go through the W3 bridge.
No private keys enter the action container.
Write operations return a `from` field in the receipt identifying the transaction signer.

## Development

```bash
npm ci
npm run all    # format, lint, test, build
```
