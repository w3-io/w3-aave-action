/**
 * AaveClient unit tests.
 *
 * Tests every public method by mocking the bridge.chain() function.
 * Verifies correct contract addresses, function signatures, args,
 * and network routing for each operation.
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AaveClient, AaveError } from '../src/aave.js'

const NETWORK = 'ethereum-sepolia'
const POOL = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951'
const DATA_PROVIDER = '0x3e9708d80f7B3e43118013075F7e95CE3AB31F31'
const ORACLE = '0x2da88497588bf89281816106C7259e31AF45a663'
const FAUCET = '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D'

const USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'
const DAI = '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357'
const USER = '0x0000000000000000000000000000000000000042'

let calls
let mockResults

function mockBridge() {
  calls = []
  mockResults = []
  return async (chainName, action, params, network) => {
    calls.push({ chainName, action, params, network })
    return mockResults.shift() ?? {}
  }
}

function client(network = NETWORK) {
  return new AaveClient({ network, bridge: mockBridge() })
}

// ── Construction ──────────────────────────────────────────────

describe('AaveClient: construction', () => {
  it('accepts a valid network', () => {
    const c = client()
    assert.equal(c.network, NETWORK)
    assert.equal(c.pool, POOL)
  })

  it('rejects an unsupported network', () => {
    assert.throws(
      () => new AaveClient({ network: 'fakenet', bridge: mockBridge() }),
      (err) => err instanceof AaveError && err.code === 'UNSUPPORTED_NETWORK',
    )
  })

  it('rejects missing network', () => {
    assert.throws(
      () => new AaveClient({ bridge: mockBridge() }),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })

  it('rejects missing bridge', () => {
    assert.throws(
      () => new AaveClient({ network: NETWORK }),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })

  it('resolves mainnet pool address', () => {
    const c = new AaveClient({ network: 'ethereum', bridge: mockBridge() })
    assert.equal(c.pool, '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2')
  })
})

// ── Core lending ──────────────────────────────────────────────

describe('supply', () => {
  it('approves and calls Pool.supply', async () => {
    await client().supply({ asset: USDC, amount: '1000000' })
    assert.equal(calls.length, 2)
    // First call: approve
    assert.equal(calls[0].action, 'approve-token')
    assert.equal(calls[0].params.token, USDC)
    assert.equal(calls[0].params.spender, POOL)
    assert.equal(calls[0].params.amount, '1000000')
    assert.equal(calls[0].network, NETWORK)
    // Second call: supply
    assert.equal(calls[1].action, 'call-contract')
    assert.equal(calls[1].params.contract, POOL)
    assert.ok(calls[1].params.method.includes('supply'))
    assert.equal(calls[1].params.args[0], USDC)
    assert.equal(calls[1].params.args[1], '1000000')
  })

  it('throws MISSING_INPUT without asset', async () => {
    await assert.rejects(
      () => client().supply({ amount: '100' }),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })

  it('throws MISSING_INPUT without amount', async () => {
    await assert.rejects(
      () => client().supply({ asset: USDC }),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })
})

describe('withdraw', () => {
  it('calls Pool.withdraw', async () => {
    await client().withdraw({ asset: USDC, amount: '1000000', to: USER })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].action, 'call-contract')
    assert.equal(calls[0].params.contract, POOL)
    assert.ok(calls[0].params.method.includes('withdraw'))
    assert.equal(calls[0].params.args[0], USDC)
    assert.equal(calls[0].params.args[1], '1000000')
    assert.equal(calls[0].params.args[2], USER)
  })

  it('throws MISSING_INPUT without asset', async () => {
    await assert.rejects(
      () => client().withdraw({ amount: '100' }),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })
})

describe('borrow', () => {
  it('calls Pool.borrow with variable rate by default', async () => {
    await client().borrow({ asset: DAI, amount: '500000000000000000' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].action, 'call-contract')
    assert.ok(calls[0].params.method.includes('borrow'))
    assert.equal(calls[0].params.args[0], DAI)
    assert.equal(calls[0].params.args[2], '2') // variable
  })

  it('accepts stable rate mode', async () => {
    await client().borrow({ asset: DAI, amount: '100', rateMode: 'stable' })
    assert.equal(calls[0].params.args[2], '1') // stable
  })

  it('throws on invalid rate mode', async () => {
    await assert.rejects(
      () => client().borrow({ asset: DAI, amount: '100', rateMode: 'invalid' }),
      (err) => err instanceof AaveError && err.code === 'INVALID_INPUT',
    )
  })
})

describe('repay', () => {
  it('approves and calls Pool.repay', async () => {
    await client().repay({ asset: DAI, amount: '500' })
    assert.equal(calls.length, 2)
    assert.equal(calls[0].action, 'approve-token')
    assert.equal(calls[1].action, 'call-contract')
    assert.ok(calls[1].params.method.includes('repay('))
  })
})

describe('repayWithATokens', () => {
  it('calls Pool.repayWithATokens without approval', async () => {
    await client().repayWithATokens({ asset: DAI, amount: '500' })
    assert.equal(calls.length, 1) // no approve
    assert.equal(calls[0].action, 'call-contract')
    assert.ok(calls[0].params.method.includes('repayWithATokens'))
  })
})

// ── Position management ──────────────────────────────────────

describe('setCollateral', () => {
  it('calls Pool.setUserUseReserveAsCollateral', async () => {
    await client().setCollateral({ asset: USDC, useAsCollateral: 'true' })
    assert.equal(calls.length, 1)
    assert.ok(calls[0].params.method.includes('setUserUseReserveAsCollateral'))
    assert.equal(calls[0].params.args[0], USDC)
    assert.equal(calls[0].params.args[1], true)
  })

  it('parses false values', async () => {
    await client().setCollateral({ asset: USDC, useAsCollateral: 'false' })
    assert.equal(calls[0].params.args[1], false)
  })
})

describe('setEMode', () => {
  it('calls Pool.setUserEMode', async () => {
    await client().setEMode({ categoryId: '1' })
    assert.equal(calls[0].action, 'call-contract')
    assert.ok(calls[0].params.method.includes('setUserEMode'))
    assert.equal(calls[0].params.args[0], '1')
  })
})

describe('swapBorrowRate', () => {
  it('calls Pool.swapBorrowRateMode', async () => {
    await client().swapBorrowRate({ asset: DAI, rateMode: 'stable' })
    assert.ok(calls[0].params.method.includes('swapBorrowRateMode'))
    assert.equal(calls[0].params.args[1], '1')
  })
})

// ── Liquidation ──────────────────────────────────────────────

describe('liquidate', () => {
  it('approves debt asset and calls liquidationCall', async () => {
    await client().liquidate({
      collateralAsset: USDC,
      debtAsset: DAI,
      user: USER,
      debtToCover: '1000',
    })
    assert.equal(calls.length, 2)
    assert.equal(calls[0].action, 'approve-token')
    assert.equal(calls[0].params.token, DAI)
    assert.equal(calls[1].action, 'call-contract')
    assert.ok(calls[1].params.method.includes('liquidationCall'))
    assert.equal(calls[1].params.args[2], USER)
  })

  it('throws without required inputs', async () => {
    await assert.rejects(
      () => client().liquidate({}),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })
})

// ── Flash loans ──────────────────────────────────────────────

describe('flashLoan', () => {
  it('calls Pool.flashLoanSimple', async () => {
    const receiver = '0x0000000000000000000000000000000000000099'
    await client().flashLoan({ receiverAddress: receiver, asset: USDC, amount: '1000000' })
    assert.equal(calls.length, 1)
    assert.ok(calls[0].params.method.includes('flashLoanSimple'))
    assert.equal(calls[0].params.args[0], receiver)
    assert.equal(calls[0].params.args[1], USDC)
    assert.equal(calls[0].params.args[2], '1000000')
  })
})

// ── Read operations ──────────────────────────────────────────

describe('getPosition', () => {
  it('reads Pool.getUserAccountData', async () => {
    const c = client()
    mockResults.push({ totalCollateralBase: '1000', healthFactor: '1500000000000000000' })
    const r = await c.getPosition({ user: USER })
    assert.equal(calls[0].action, 'read-contract')
    assert.equal(calls[0].params.contract, POOL)
    assert.ok(calls[0].params.method.includes('getUserAccountData'))
    assert.equal(calls[0].params.args[0], USER)
    assert.deepEqual(r, { totalCollateralBase: '1000', healthFactor: '1500000000000000000' })
  })

  it('throws MISSING_INPUT without user', async () => {
    await assert.rejects(
      () => client().getPosition({}),
      (err) => err instanceof AaveError && err.code === 'MISSING_INPUT',
    )
  })
})

describe('getReserveData', () => {
  it('reads PoolDataProvider.getReserveData', async () => {
    await client().getReserveData({ asset: USDC })
    assert.equal(calls[0].action, 'read-contract')
    assert.equal(calls[0].params.contract, DATA_PROVIDER)
    assert.ok(calls[0].params.method.includes('getReserveData'))
    assert.equal(calls[0].params.args[0], USDC)
  })
})

describe('getUserReserveData', () => {
  it('reads PoolDataProvider.getUserReserveData', async () => {
    await client().getUserReserveData({ asset: USDC, user: USER })
    assert.equal(calls[0].params.contract, DATA_PROVIDER)
    assert.ok(calls[0].params.method.includes('getUserReserveData'))
    assert.deepEqual(calls[0].params.args, [USDC, USER])
  })
})

describe('getReservesList', () => {
  it('reads Pool.getReservesList', async () => {
    const c = client()
    mockResults.push([USDC, DAI])
    const r = await c.getReservesList()
    assert.equal(calls[0].params.contract, POOL)
    assert.ok(calls[0].params.method.includes('getReservesList'))
    assert.deepEqual(r, [USDC, DAI])
  })
})

describe('getAssetPrice', () => {
  it('reads AaveOracle.getAssetPrice', async () => {
    const c = client()
    mockResults.push('100000000') // $1.00 in 8 decimals
    const r = await c.getAssetPrice({ asset: USDC })
    assert.equal(calls[0].params.contract, ORACLE)
    assert.ok(calls[0].params.method.includes('getAssetPrice'))
    assert.equal(r, '100000000')
  })
})

describe('getReserveConfig', () => {
  it('reads PoolDataProvider.getReserveConfigurationData', async () => {
    await client().getReserveConfig({ asset: USDC })
    assert.equal(calls[0].params.contract, DATA_PROVIDER)
    assert.ok(calls[0].params.method.includes('getReserveConfigurationData'))
  })
})

describe('getEModeData', () => {
  it('reads Pool.getEModeCategoryData', async () => {
    await client().getEModeData({ categoryId: '1' })
    assert.equal(calls[0].params.contract, POOL)
    assert.ok(calls[0].params.method.includes('getEModeCategoryData'))
    assert.equal(calls[0].params.args[0], '1')
  })
})

// ── Testnet helpers ──────────────────────────────────────────

describe('faucetMint', () => {
  it('calls Faucet.mint on testnet', async () => {
    await client().faucetMint({ token: USDC, to: USER, amount: '10000000000' })
    assert.equal(calls[0].action, 'call-contract')
    assert.equal(calls[0].params.contract, FAUCET)
    assert.ok(calls[0].params.method.includes('mint'))
    assert.deepEqual(calls[0].params.args, [USDC, USER, '10000000000'])
  })

  it('throws UNSUPPORTED_NETWORK on mainnet', async () => {
    const c = new AaveClient({ network: 'ethereum', bridge: mockBridge() })
    await assert.rejects(
      () => c.faucetMint({ token: USDC, to: USER, amount: '100' }),
      (err) => err instanceof AaveError && err.code === 'UNSUPPORTED_NETWORK',
    )
  })
})

// ── Network routing ──────────────────────────────────────────

describe('network routing', () => {
  it('passes network to every bridge call', async () => {
    await client('ethereum').getReservesList()
    assert.equal(calls[0].network, 'ethereum')
    assert.equal(calls[0].chainName, 'ethereum')
  })

  it('uses correct pool for polygon', async () => {
    const c = new AaveClient({ network: 'polygon', bridge: mockBridge() })
    await c.getReservesList()
    assert.equal(calls[0].params.contract, '0x794a61358D6845594F94dc1DB02A252b5b4814aD')
  })

  it('uses correct pool for arbitrum', async () => {
    const c = new AaveClient({ network: 'arbitrum', bridge: mockBridge() })
    await c.getReservesList()
    assert.equal(calls[0].params.contract, '0x794a61358D6845594F94dc1DB02A252b5b4814aD')
  })

  it('uses correct pool for base', async () => {
    const c = new AaveClient({ network: 'base', bridge: mockBridge() })
    await c.getReservesList()
    assert.equal(calls[0].params.contract, '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5')
  })
})
