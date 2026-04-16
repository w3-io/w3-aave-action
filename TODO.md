# TODO

## Ecosystem-state blocked (not code bugs)

These skip because setting them up requires _provoking the right
Aave protocol state_ — not because anything in the action is wrong.

- [ ] `repay-with-atokens` — requires an active borrow position on
      the test wallet. Supply USDC, borrow DAI, then the repay-with-
      atokens path becomes exercisable. Fold into the happy-path E2E
      sequence.
- [ ] `flash-loan` — requires a deployed `FlashLoanReceiver`
      contract (an Aave-spec contract that handles the callback).
      Deploy one on Base Sepolia and wire its address into the E2E.
- [ ] `liquidate` — requires an underwater borrow position. Hard
      to engineer in test mode because price stability. Options: - Use Aave's testnet with mock oracles and shift the oracle
      price to force liquidation. - Fund a position, wait for natural market movement (slow,
      flaky). - Document as permanent skip; real testing only happens on
      mainnet forks.

## Potential additions

- [ ] V3's e-mode category switching — we have `set-emode` but
      haven't exercised it in E2E. Requires setting up the position
      in a category, then switching. Touches the same stateful
      scaffolding as repay-with-atokens.
- [ ] Governance reads — `get-proposal`, `get-voting-power`. Useful
      for workflows that gate actions on Aave governance state
      (e.g. "execute rebalance only if proposal X passed").
- [ ] `get-rewards-balance` + `claim-rewards` — Aave's incentive
      distribution. Our action covers lending but not the
      reward-harvesting half.

## Docs

- [ ] `docs/guide.md` has the lending pattern but not the flash
      loan one. A worked example that deploys a receiver + triggers
      a flash loan is the real test of whether a workflow author
      can use this product.
