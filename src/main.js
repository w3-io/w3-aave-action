import * as core from '@actions/core'
import { createCommandRouter, setJsonOutput, handleError } from '@w3-io/action-core'
import { AaveClient, AaveError } from './aave.js'

/**
 * W3 Aave V3 Action — command dispatch.
 *
 * 16 commands across 5 categories covering Aave V3's lending surface:
 * lending, position management, liquidation, flash loans, and reads.
 *
 * All on-chain operations use the W3 bridge — no private keys enter
 * the action container.
 */

let bridgeFn

function getBridge() {
  if (bridgeFn) return bridgeFn
  // Lazy-import bridge to avoid loading it at module parse time
  // (helps testability — tests inject their own bridge mock)
  throw new AaveError('BRIDGE_NOT_AVAILABLE', 'W3 bridge is not available in this context')
}

/** Initialize the bridge from @w3-io/action-core. */
async function initBridge() {
  if (bridgeFn) return
  try {
    const mod = await import('@w3-io/action-core')
    if (mod.bridge && typeof mod.bridge.chain === 'function') {
      bridgeFn = mod.bridge.chain
    }
  } catch {
    // Bridge not available — will throw on use
  }
}

/** Allow tests to inject a mock bridge. */
export function setBridge(fn) {
  bridgeFn = fn
}

function getClient() {
  const network = core.getInput('network', { required: true })
  return new AaveClient({ network, bridge: getBridge() })
}

/** Read an optional input, returning undefined if empty. */
function opt(name) {
  const v = core.getInput(name)
  return v || undefined
}

const handlers = {
  // ── Core lending ──────────────────────────────────────────────
  supply: async () => {
    const r = await getClient().supply({
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      onBehalfOf: opt('on-behalf-of'),
      referralCode: opt('referral-code'),
    })
    setJsonOutput('result', r)
  },

  withdraw: async () => {
    const r = await getClient().withdraw({
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      to: opt('to'),
    })
    setJsonOutput('result', r)
  },

  borrow: async () => {
    const r = await getClient().borrow({
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      rateMode: opt('rate-mode'),
      onBehalfOf: opt('on-behalf-of'),
      referralCode: opt('referral-code'),
    })
    setJsonOutput('result', r)
  },

  repay: async () => {
    const r = await getClient().repay({
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      rateMode: opt('rate-mode'),
      onBehalfOf: opt('on-behalf-of'),
    })
    setJsonOutput('result', r)
  },

  'repay-with-atokens': async () => {
    const r = await getClient().repayWithATokens({
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      rateMode: opt('rate-mode'),
    })
    setJsonOutput('result', r)
  },

  // ── Position management ───────────────────────────────────────
  'set-collateral': async () => {
    const r = await getClient().setCollateral({
      asset: core.getInput('asset', { required: true }),
      useAsCollateral: core.getInput('value', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'set-emode': async () => {
    const r = await getClient().setEMode({
      categoryId: core.getInput('category-id', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'swap-borrow-rate': async () => {
    const r = await getClient().swapBorrowRate({
      asset: core.getInput('asset', { required: true }),
      rateMode: core.getInput('rate-mode', { required: true }),
    })
    setJsonOutput('result', r)
  },

  // ── Liquidation ───────────────────────────────────────────────
  liquidate: async () => {
    const r = await getClient().liquidate({
      collateralAsset: core.getInput('collateral-asset', { required: true }),
      debtAsset: core.getInput('debt-asset', { required: true }),
      user: core.getInput('user', { required: true }),
      debtToCover: core.getInput('amount', { required: true }),
      receiveAToken: opt('receive-atoken'),
    })
    setJsonOutput('result', r)
  },

  // ── Flash loans ───────────────────────────────────────────���───
  'flash-loan': async () => {
    const r = await getClient().flashLoan({
      receiverAddress: core.getInput('receiver', { required: true }),
      asset: core.getInput('asset', { required: true }),
      amount: core.getInput('amount', { required: true }),
      params: opt('params'),
      referralCode: opt('referral-code'),
    })
    setJsonOutput('result', r)
  },

  // ── Read operations ───────────────────────────────────────────
  'get-position': async () => {
    const r = await getClient().getPosition({
      user: core.getInput('user', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'get-reserve-data': async () => {
    const r = await getClient().getReserveData({
      asset: core.getInput('asset', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'get-user-reserve': async () => {
    const r = await getClient().getUserReserveData({
      asset: core.getInput('asset', { required: true }),
      user: core.getInput('user', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'get-reserves-list': async () => {
    const r = await getClient().getReservesList()
    setJsonOutput('result', r)
  },

  'get-asset-price': async () => {
    const r = await getClient().getAssetPrice({
      asset: core.getInput('asset', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'get-reserve-config': async () => {
    const r = await getClient().getReserveConfig({
      asset: core.getInput('asset', { required: true }),
    })
    setJsonOutput('result', r)
  },

  'get-emode-data': async () => {
    const r = await getClient().getEModeData({
      categoryId: core.getInput('category-id', { required: true }),
    })
    setJsonOutput('result', r)
  },

  // ── Testnet ───────────────────────────────────────────────────
  'faucet-mint': async () => {
    const r = await getClient().faucetMint({
      token: core.getInput('asset', { required: true }),
      to: core.getInput('to', { required: true }),
      amount: core.getInput('amount', { required: true }),
    })
    setJsonOutput('result', r)
  },
}

const router = createCommandRouter(handlers)

export async function run() {
  await initBridge()
  try {
    router()
  } catch (error) {
    handleError(error)
  }
}
