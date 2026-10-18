const TEST_MODE_KEY = 'licex_p2p_test_mode_v1'
const TEST_USDT_BALANCE_KEY = 'licex_p2p_test_usdt_balance_v1'
const TEST_ASSET_BALANCES_KEY = 'licex_p2p_test_asset_balances_v1'
const TEST_NODE_PUBKEY_KEY = 'licex_p2p_test_node_pubkey_v1'
const INITIAL_TEST_USDT = 1000

function hasStorage(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  )
}

export function isP2PSimulationAvailable(): boolean {
  return import.meta.env.DEV && hasStorage()
}

export function isP2PSimulationEnabled(): boolean {
  return (
    isP2PSimulationAvailable() &&
    window.localStorage.getItem(TEST_MODE_KEY) === 'enabled'
  )
}

export function enableP2PSimulation(): void {
  if (!isP2PSimulationAvailable()) {
    throw new Error(
      'La simulazione P2P è disponibile solo in modalità sviluppo.'
    )
  }
  window.localStorage.setItem(TEST_MODE_KEY, 'enabled')
  if (window.localStorage.getItem(TEST_USDT_BALANCE_KEY) === null) {
    window.localStorage.setItem(
      TEST_USDT_BALANCE_KEY,
      String(INITIAL_TEST_USDT)
    )
  }
}

export function resetP2PSimulationWallet(): void {
  if (!isP2PSimulationAvailable()) {
    throw new Error(
      'La simulazione P2P è disponibile solo in modalità sviluppo.'
    )
  }
  window.localStorage.setItem(TEST_MODE_KEY, 'enabled')
  window.localStorage.setItem(TEST_USDT_BALANCE_KEY, String(INITIAL_TEST_USDT))
  window.localStorage.setItem(TEST_ASSET_BALANCES_KEY, '{}')
}

export function getP2PSimulationUsdtBalance(): number {
  if (!isP2PSimulationEnabled()) return 0
  const balance = Number(window.localStorage.getItem(TEST_USDT_BALANCE_KEY))
  return Number.isFinite(balance) && balance >= 0 ? balance : 0
}

export function adjustP2PSimulationUsdtBalance(delta: number): number {
  if (!isP2PSimulationEnabled()) {
    throw new Error('Attiva prima il portafoglio P2P di test.')
  }
  const nextBalance =
    Math.round((getP2PSimulationUsdtBalance() + delta) * 100) / 100
  if (nextBalance < 0) throw new Error('Saldo demo USDT insufficiente.')
  window.localStorage.setItem(TEST_USDT_BALANCE_KEY, String(nextBalance))
  return nextBalance
}

function readAssetBalances(): Record<string, number> {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TEST_ASSET_BALANCES_KEY) ?? '{}'
    )
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getP2PSimulationAssetBalance(assetId: string): number {
  if (!isP2PSimulationEnabled() || !hasStorage()) return 0
  const balance = Number(readAssetBalances()[assetId] ?? 0)
  return Number.isFinite(balance) && balance > 0 ? balance : 0
}

export function setP2PSimulationAssetBalance(
  assetId: string,
  amount: number
): void {
  if (!isP2PSimulationEnabled()) {
    throw new Error('Attiva prima il portafoglio P2P di test.')
  }
  const balances = readAssetBalances()
  balances[assetId] = Math.max(0, amount)
  window.localStorage.setItem(TEST_ASSET_BALANCES_KEY, JSON.stringify(balances))
}

export function getP2PSimulationNodePubkey(): string {
  if (!isP2PSimulationEnabled()) {
    throw new Error('Attiva prima il portafoglio P2P di test.')
  }
  const stored = window.localStorage.getItem(TEST_NODE_PUBKEY_KEY)
  if (stored) return stored
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const pubkey = `02${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  window.localStorage.setItem(TEST_NODE_PUBKEY_KEY, pubkey)
  return pubkey
}

export function createP2PSimulationSwapString(
  licenseAssetId: string,
  priceUsdt: number
): string {
  const amount = Math.round(priceUsdt * 100)
  const paymentHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `${amount}/demo-usdt/1/${licenseAssetId}/3600/${paymentHash}`
}
