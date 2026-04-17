# Aave V3 Action Reference

## Inputs

All commands require `command` and `network`.
Other inputs depend on the command.

| Input              | Type    | Required by                                                                                                                                                                             | Description                                    |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `command`          | string  | all                                                                                                                                                                                     | Operation to perform                           |
| `network`          | string  | all                                                                                                                                                                                     | Blockchain network                             |
| `asset`            | address | supply, withdraw, borrow, repay, repay-with-atokens, set-collateral, swap-borrow-rate, flash-loan, get-reserve-data, get-user-reserve, get-asset-price, get-reserve-config, faucet-mint | ERC-20 token address                           |
| `amount`           | string  | supply, withdraw, borrow, repay, repay-with-atokens, flash-loan, faucet-mint                                                                                                            | Amount in token base units                     |
| `to`               | address | withdraw, faucet-mint                                                                                                                                                                   | Recipient address                              |
| `on-behalf-of`     | address | borrow                                                                                                                                                                                  | Address to borrow on behalf of                 |
| `user`             | address | get-position, get-user-reserve, liquidate, get-voting-power, get-rewards-balance                                                                                                        | User/wallet address                            |
| `rate-mode`        | string  | borrow, repay, swap-borrow-rate                                                                                                                                                         | `"stable"` or `"variable"` (default: variable) |
| `referral-code`    | string  | supply, borrow, flash-loan                                                                                                                                                              | Aave referral code (default: 0)                |
| `value`            | string  | set-collateral                                                                                                                                                                          | `"true"` or `"false"`                          |
| `category-id`      | string  | set-emode, get-emode-data                                                                                                                                                               | E-mode category ID                             |
| `collateral-asset` | address | liquidate                                                                                                                                                                               | Collateral token for liquidation               |
| `debt-asset`       | address | liquidate                                                                                                                                                                               | Debt token for liquidation                     |
| `receive-atoken`   | string  | liquidate                                                                                                                                                                               | Receive aTokens instead of underlying          |
| `receiver`         | address | flash-loan                                                                                                                                                                              | Flash loan receiver contract                   |
| `params`           | bytes   | flash-loan                                                                                                                                                                              | Encoded data for flash loan receiver           |
| `proposal-id`      | string  | get-proposal                                                                                                                                                                            | Governance proposal ID                         |
| `block-number`     | string  | get-voting-power                                                                                                                                                                        | Block number for voting power query            |
| `assets`           | string  | get-rewards-balance, claim-rewards                                                                                                                                                      | Comma-separated aToken/debt token addresses    |
| `reward`           | address | get-rewards-balance, claim-rewards                                                                                                                                                      | Reward token address                           |

## Output

All commands return a single `result` output as JSON.

Write operations include:

```json
{
  "ok": true,
  "from": "0x...",
  "txHash": "0x...",
  "blockNumber": "123",
  "gasUsed": "21000",
  "status": "success",
  "logs": "[...]"
}
```

The `from` field is the address that signed the transaction, sourced from the RPC receipt.
It is per-transaction, not a global identity.

Read operations return the decoded contract result:

```json
{
  "ok": true,
  "result": "[\"1000\", \"500\", ...]",
  "raw": "0x..."
}
```

## Signer address resolution

Write operations that need an `onBehalfOf` or `to` address use one of two strategies:

- **Supply, repay**: derive the signer address from the preceding approve transaction's `from` field.
  No key derivation occurs — the address comes from the RPC receipt.
- **Withdraw, borrow**: require the caller to pass the address explicitly.
  This avoids silently assuming "the signer" when multi-address workflows are in play.

## Commands

### Lending

#### `supply`

Supply an asset as collateral.
Automatically approves the Pool to spend the token.
When `on-behalf-of` is omitted, the signer address is read from the approve receipt.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: supply
    network: ethereum
    asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    amount: '1000000'
```

#### `withdraw`

Withdraw an asset (redeem aTokens for underlying).
The `to` address is required.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: withdraw
    network: ethereum
    asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    amount: '1000000'
    to: '0xYourWallet...'
```

#### `borrow`

Borrow an asset against supplied collateral.
The `on-behalf-of` address is required.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: borrow
    network: ethereum
    asset: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    amount: '1000000000000000000'
    on-behalf-of: '0xYourWallet...'
    rate-mode: variable
```

#### `repay`

Repay borrowed debt.
Automatically approves the Pool to spend the token.
When `on-behalf-of` is omitted, the signer address is read from the approve receipt.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: repay
    network: ethereum
    asset: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    amount: '1000000000000000000'
```

#### `repay-with-atokens`

Repay debt using aTokens (no approval needed).

### Position management

#### `set-collateral`

Toggle whether an asset is used as collateral.

#### `set-emode`

Set efficiency mode category for the caller.

#### `swap-borrow-rate`

Switch between stable and variable borrow rate.

### Liquidation

#### `liquidate`

Liquidate an undercollateralized position.
Requires `collateral-asset`, `debt-asset`, `user`, and `amount`.

### Flash loans

#### `flash-loan`

Execute a single-asset flash loan via `flashLoanSimple`.

### Read operations

#### `get-position`

Get a user's aggregated account data: collateral, debt, available borrows, health factor.

#### `get-reserve-data`

Get reserve data for an asset (liquidity, rates, configuration).

#### `get-user-reserve`

Get a user's reserve-specific data (aToken balance, debt, etc.).

#### `get-reserves-list`

List all reserve addresses in the Pool.

#### `get-asset-price`

Get an asset's price from the Aave Oracle (8 decimal USD).

#### `get-reserve-config`

Get reserve configuration: LTV, liquidation threshold, borrowing enabled, etc.

#### `get-emode-data`

Get e-mode category configuration.

### Governance

#### `get-proposal`

Get an Aave governance proposal by ID. Ethereum mainnet only.
Returns proposal state, creator, voting config, and timestamps.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: get-proposal
    network: ethereum
    proposal-id: '1'
```

#### `get-voting-power`

Get a user's voting power at a given block number. Ethereum mainnet only.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: get-voting-power
    network: ethereum
    user: '0xYourWallet...'
    block-number: '18500000'
```

### Rewards

#### `get-rewards-balance`

Get unclaimed rewards for a user. Ethereum mainnet only.
Pass aToken or debt token addresses as a comma-separated list.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: get-rewards-balance
    network: ethereum
    assets: '0xBcca60bB61934080951369a648Fb03DF4F96263C'
    user: '0xYourWallet...'
    reward: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
```

#### `claim-rewards`

Claim accumulated rewards. Ethereum mainnet only.
Write operation that transfers unclaimed rewards to the `to` address.

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: claim-rewards
    network: ethereum
    assets: '0xBcca60bB61934080951369a648Fb03DF4F96263C'
    amount: '1000000000000000000'
    to: '0xYourWallet...'
    reward: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
```

### Testnet

#### `faucet-mint`

Mint test tokens from the Aave faucet (Sepolia only).

```yaml
- uses: w3-io/w3-aave-action@v1
  with:
    command: faucet-mint
    network: ethereum-sepolia
    asset: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'
    to: '0xYourWallet...'
    amount: '10000000'
```

## Error codes

| Code                   | Meaning                                           |
| ---------------------- | ------------------------------------------------- |
| `MISSING_INPUT`        | A required input was not provided                 |
| `INVALID_INPUT`        | An input value is malformed (e.g., bad rate mode) |
| `UNSUPPORTED_NETWORK`  | The network is not in the address book            |
| `PROVIDER_ERROR`       | RPC communication failed                          |
| `REVERTED`             | The on-chain transaction reverted                 |
| `BRIDGE_NOT_AVAILABLE` | W3 bridge is not reachable                        |

## Networks and contract addresses

Pool addresses per network are hardcoded from `@bgd-labs/aave-address-book`:

| Network          | Pool                                         |
| ---------------- | -------------------------------------------- |
| ethereum         | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| polygon          | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| arbitrum         | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| optimism         | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| base             | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| avalanche        | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |
| bnb              | `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` |
| gnosis           | `0xb50201558B00496A145fE76f7424749556E326D8` |
| scroll           | `0x11fCfe756c05AD438e312a7fd934381537D3cFfe` |
| metis            | `0x90df02551bB792286e8D4f13E0e357b4Bf1D6a57` |
| zksync           | `0x78e30497a3c7527d953C6B1C5c1c1F9c74D3bC74` |
| polygon-zkevm    | `0xc4F7b5d4ca00eE04cF9887D5D811d3C3B35Cc764` |
| ethereum-sepolia | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` |

Governance and rewards contracts (Ethereum mainnet only):

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| Governance V3        | `0x9AEE0B04504CeF83A65AC3f0e838D0593BCb2BC7` |
| IncentivesController | `0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb` |
