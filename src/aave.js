/**
 * Aave V3 client — on-chain operations via W3 bridge.
 *
 * All contract interactions go through bridge.chain() from
 * @w3-io/action-core. No ethers.js, no private keys in the
 * action container — the bridge handles signing on the host.
 *
 * Aave V3 contract addresses per chain are hardcoded from
 * @bgd-labs/aave-address-book. Each chain has a different Pool
 * address discovered via PoolAddressesProvider.
 *
 * Supported networks:
 *   ethereum, polygon, arbitrum, optimism, base, avalanche,
 *   bnb, gnosis, scroll, metis, zksync, polygon-zkevm,
 *   ethereum-sepolia (testnet)
 */

import { W3ActionError } from '@w3-io/action-core'

export class AaveError extends W3ActionError {
  constructor(code, message, { details } = {}) {
    super(code, message, { details })
    this.name = 'AaveError'
  }
}

/**
 * Aave V3 Pool addresses per network.
 * Source: @bgd-labs/aave-address-book
 */
const POOL_ADDRESSES = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  bnb: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
  gnosis: '0xb50201558B00496A145fE76f7424749556E326D8',
  scroll: '0x11fCfe756c05AD438e312a7fd934381537D3cFfe',
  metis: '0x90df02551bB792286e8D4f13E0e357b4Bf1D6a57',
  zksync: '0x78e30497a3c7527d953C6B1C5c1c1F9c74D3bC74',
  'polygon-zkevm': '0xc4F7b5d4ca00eE04cF9887D5D811d3C3B35Cc764',
  'ethereum-sepolia': '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
}

const POOL_DATA_PROVIDER_ADDRESSES = {
  ethereum: '0x7B4EB56E7CD4b454BA8ff71E4518426c487F7c1a',
  polygon: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  arbitrum: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  optimism: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  base: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
  avalanche: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  'ethereum-sepolia': '0x3e9708d80f7B3e43118013075F7e95CE3AB31F31',
}

const ORACLE_ADDRESSES = {
  ethereum: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
  polygon: '0xb023e699F5a33916Ea823A16485e259257cA8Bd1',
  arbitrum: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7',
  optimism: '0xD81eb3728a631871a7eBBaD631b5f424909f0c77',
  base: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156',
  avalanche: '0xEBd36016B3eD09D4693Ed4251c67Bd858c3c7C9C',
  'ethereum-sepolia': '0x2da88497588bf89281816106C7259e31AF45a663',
}

const WETH_GATEWAY_ADDRESSES = {
  ethereum: '0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9',
  polygon: '0xC1E320966c485ebF2A0A2A6d3c0Dc860A156eB1B',
  arbitrum: '0xB5Ee21786D28c5Ba61661550879475976B707099',
  optimism: '0xe9E52021f4e11DEAD8661812A0A6c8627abA2a54',
  base: '0x8be473dCfA93132559B118a2e512d52FE74b1d18',
  avalanche: '0xa938d8536aEed1Bd48f548380394Ab30Aa11B00E',
  'ethereum-sepolia': '0x387d311e47e80b498169e6fb51d3193167d89F7D',
}

const FAUCET_ADDRESSES = {
  'ethereum-sepolia': '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D',
}

/** Interest rate modes used by Aave V3. */
const RATE_MODE = { NONE: 0, STABLE: 1, VARIABLE: 2 }

function parseRateMode(value) {
  if (!value) return RATE_MODE.VARIABLE
  const v = value.toLowerCase()
  if (v === 'stable' || v === '1') return RATE_MODE.STABLE
  if (v === 'variable' || v === '2') return RATE_MODE.VARIABLE
  if (v === 'none' || v === '0') return RATE_MODE.NONE
  throw new AaveError('INVALID_INPUT', `Invalid rate mode "${value}". Use "stable" or "variable".`)
}

export class AaveClient {
  /**
   * @param {object} options
   * @param {string} options.network - Chain name (ethereum, polygon, ethereum-sepolia, etc.)
   * @param {function} options.bridge - The bridge.chain function from @w3-io/action-core
   */
  constructor({ network, bridge } = {}) {
    if (!network) throw new AaveError('MISSING_INPUT', 'network is required')
    if (!bridge) throw new AaveError('MISSING_INPUT', 'bridge function is required')

    const pool = POOL_ADDRESSES[network]
    if (!pool) {
      throw new AaveError(
        'UNSUPPORTED_NETWORK',
        `Network "${network}" is not supported. Available: ${Object.keys(POOL_ADDRESSES).join(', ')}`,
      )
    }

    this.network = network
    this.bridge = bridge
    this.pool = pool
    this.dataProvider = POOL_DATA_PROVIDER_ADDRESSES[network]
    this.oracle = ORACLE_ADDRESSES[network]
    this.wethGateway = WETH_GATEWAY_ADDRESSES[network]
    this.faucet = FAUCET_ADDRESSES[network]
  }

  // ── Internal helpers ──────────────────────────────────────────

  async #read(contract, method, args = []) {
    return this.bridge('ethereum', 'read-contract', { contract, method, args }, this.network)
  }

  async #call(contract, method, args = []) {
    return this.bridge('ethereum', 'call-contract', { contract, method, args }, this.network)
  }

  async #approve(token, spender, amount) {
    return this.bridge('ethereum', 'approve-token', { token, spender, amount }, this.network)
  }

  // ── Core lending operations ───────────────────────────────────

  /**
   * Supply (deposit) an asset as collateral.
   * Automatically approves the Pool to spend the token.
   *
   * When `onBehalfOf` is omitted, the signer's address is read from
   * the approve receipt (`from` field) — no key derivation needed.
   */
  async supply({ asset, amount, onBehalfOf, referralCode = '0' } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')

    const approveResult = await this.#approve(asset, this.pool, amount)
    const sender = onBehalfOf || approveResult.from

    const args = [asset, amount, sender, referralCode]
    return this.#call(
      this.pool,
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
      args,
    )
  }

  /**
   * Withdraw an asset (redeem aTokens for underlying).
   *
   * The `to` address is required — Aave does not default to
   * msg.sender when `address(0)` is passed.
   */
  async withdraw({ asset, amount, to } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')
    if (!to) throw new AaveError('MISSING_INPUT', 'to address is required (signer wallet address)')

    const args = [asset, amount, to]
    return this.#call(
      this.pool,
      'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
      args,
    )
  }

  /**
   * Borrow an asset against supplied collateral.
   *
   * The `onBehalfOf` address is required — Aave does not default
   * to msg.sender when `address(0)` is passed.
   */
  async borrow({ asset, amount, rateMode, onBehalfOf, referralCode = '0' } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')
    if (!onBehalfOf)
      throw new AaveError('MISSING_INPUT', 'onBehalfOf address is required (signer wallet address)')

    const mode = parseRateMode(rateMode)
    const args = [asset, amount, mode.toString(), referralCode, onBehalfOf]
    return this.#call(
      this.pool,
      'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
      args,
    )
  }

  /**
   * Repay borrowed debt.
   * Automatically approves the Pool to spend the token.
   *
   * When `onBehalfOf` is omitted, the signer's address is read from
   * the approve receipt (`from` field) — no key derivation needed.
   */
  async repay({ asset, amount, rateMode, onBehalfOf } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')

    const approveResult = await this.#approve(asset, this.pool, amount)
    const sender = onBehalfOf || approveResult.from

    const mode = parseRateMode(rateMode)
    const args = [asset, amount, mode.toString(), sender]
    return this.#call(
      this.pool,
      'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
      args,
    )
  }

  /** Repay debt using aTokens (no approval needed — user already holds them). */
  async repayWithATokens({ asset, amount, rateMode } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')

    const mode = parseRateMode(rateMode)
    const args = [asset, amount, mode.toString()]
    return this.#call(
      this.pool,
      'function repayWithATokens(address asset, uint256 amount, uint256 interestRateMode) returns (uint256)',
      args,
    )
  }

  // ── Position management ───────────────────────────────────────

  /** Toggle whether an asset is used as collateral. */
  async setCollateral({ asset, useAsCollateral } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (useAsCollateral === undefined) {
      throw new AaveError('MISSING_INPUT', 'useAsCollateral (true/false) is required')
    }

    const enabled = ['true', 'yes', '1'].includes(String(useAsCollateral).toLowerCase())
    return this.#call(
      this.pool,
      'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
      [asset, enabled],
    )
  }

  /** Set efficiency mode (e-mode) category for the caller. */
  async setEMode({ categoryId } = {}) {
    if (categoryId === undefined) {
      throw new AaveError('MISSING_INPUT', 'categoryId is required')
    }
    return this.#call(this.pool, 'function setUserEMode(uint8 categoryId)', [categoryId])
  }

  /** Switch between stable and variable borrow rate. */
  async swapBorrowRate({ asset, rateMode } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!rateMode) throw new AaveError('MISSING_INPUT', 'rateMode is required')

    const mode = parseRateMode(rateMode)
    return this.#call(
      this.pool,
      'function swapBorrowRateMode(address asset, uint256 interestRateMode)',
      [asset, mode.toString()],
    )
  }

  // ── Liquidation ───────────────────────────────────────────────

  /** Liquidate an undercollateralized position. */
  async liquidate({ collateralAsset, debtAsset, user, debtToCover, receiveAToken } = {}) {
    if (!collateralAsset) throw new AaveError('MISSING_INPUT', 'collateralAsset is required')
    if (!debtAsset) throw new AaveError('MISSING_INPUT', 'debtAsset is required')
    if (!user) throw new AaveError('MISSING_INPUT', 'user address is required')
    if (!debtToCover) throw new AaveError('MISSING_INPUT', 'debtToCover amount is required')

    await this.#approve(debtAsset, this.pool, debtToCover)

    const receive = ['true', 'yes', '1'].includes(String(receiveAToken || 'false').toLowerCase())
    return this.#call(
      this.pool,
      'function liquidationCall(address collateralAsset, address debtAsset, address user, uint256 debtToCover, bool receiveAToken)',
      [collateralAsset, debtAsset, user, debtToCover, receive],
    )
  }

  // ── Flash loans ───────────────────────────────────────────────

  /** Execute a single-asset flash loan. */
  async flashLoan({ receiverAddress, asset, amount, params = '0x', referralCode = '0' } = {}) {
    if (!receiverAddress) throw new AaveError('MISSING_INPUT', 'receiverAddress is required')
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')

    return this.#call(
      this.pool,
      'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes params, uint16 referralCode)',
      [receiverAddress, asset, amount, params, referralCode],
    )
  }

  // ── Read operations ───────────────────────────────────────────

  /** Get a user's aggregated account data (collateral, debt, health factor). */
  async getPosition({ user } = {}) {
    if (!user) throw new AaveError('MISSING_INPUT', 'user address is required')

    const result = await this.#read(
      this.pool,
      'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
      [user],
    )
    return result
  }

  /** Get detailed reserve data for an asset. */
  async getReserveData({ asset } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!this.dataProvider) {
      throw new AaveError(
        'UNSUPPORTED_NETWORK',
        `PoolDataProvider not configured for "${this.network}"`,
      )
    }

    return this.#read(
      this.dataProvider,
      'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
      [asset],
    )
  }

  /** Get a user's position in a specific reserve. */
  async getUserReserveData({ asset, user } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!user) throw new AaveError('MISSING_INPUT', 'user address is required')
    if (!this.dataProvider) {
      throw new AaveError(
        'UNSUPPORTED_NETWORK',
        `PoolDataProvider not configured for "${this.network}"`,
      )
    }

    return this.#read(
      this.dataProvider,
      'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
      [asset, user],
    )
  }

  /** Get all reserve token addresses in this market. */
  async getReservesList() {
    return this.#read(this.pool, 'function getReservesList() view returns (address[])', [])
  }

  /** Get the oracle price for an asset (in base currency, 8 decimals). */
  async getAssetPrice({ asset } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!this.oracle) {
      throw new AaveError('UNSUPPORTED_NETWORK', `Oracle not configured for "${this.network}"`)
    }

    return this.#read(this.oracle, 'function getAssetPrice(address asset) view returns (uint256)', [
      asset,
    ])
  }

  /** Get reserve configuration (LTV, thresholds, flags). */
  async getReserveConfig({ asset } = {}) {
    if (!asset) throw new AaveError('MISSING_INPUT', 'asset address is required')
    if (!this.dataProvider) {
      throw new AaveError(
        'UNSUPPORTED_NETWORK',
        `PoolDataProvider not configured for "${this.network}"`,
      )
    }

    return this.#read(
      this.dataProvider,
      'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
      [asset],
    )
  }

  /** Get e-mode category data. */
  async getEModeData({ categoryId } = {}) {
    if (categoryId === undefined) {
      throw new AaveError('MISSING_INPUT', 'categoryId is required')
    }

    return this.#read(
      this.pool,
      'function getEModeCategoryData(uint8 id) view returns (uint16 ltv, uint16 liquidationThreshold, uint16 liquidationBonus, address priceSource, string label)',
      [categoryId],
    )
  }

  // ── Testnet helpers ───────────────────────────────────────────

  /** Mint test tokens from the Aave faucet (testnet only). */
  async faucetMint({ token, to, amount } = {}) {
    if (!this.faucet) {
      throw new AaveError('UNSUPPORTED_NETWORK', `Faucet not available on "${this.network}"`)
    }
    if (!token) throw new AaveError('MISSING_INPUT', 'token address is required')
    if (!to) throw new AaveError('MISSING_INPUT', 'recipient address is required')
    if (!amount) throw new AaveError('MISSING_INPUT', 'amount is required')

    return this.#call(
      this.faucet,
      'function mint(address token, address to, uint256 amount) returns (uint256)',
      [token, to, amount],
    )
  }
}
