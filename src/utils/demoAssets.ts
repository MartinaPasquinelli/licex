import { NiaAsset } from '../slices/nodeApi/nodeApi.slice'
import { logger } from './logger'

const DEMO_UTXO_STORAGE_KEY = 'licex_demo_utxos'

const DEMO_STORAGE_KEY = 'licex_demo_rgb_assets'

export interface CreateDemoAssetInput {
  ticker: string
  name: string
  amount: number
  precision: number
}

/**
 * Generate a realistic RGB asset ID conforming to the standard RGB format (rgb:2...)
 */
export const generateRgbAssetId = (): string => {
  const chars = 'abcdefghijkmnopqrstuvwxyz123456789'
  let id = 'rgb:2'
  for (let i = 0; i < 48; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

/**
 * Retrieve all demo RGB assets from localStorage.
 */
export const getDemoRgbAssets = (): NiaAsset[] => {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Create and persist a new demo RGB asset in localStorage.
 */
export const saveDemoRgbAsset = (input: CreateDemoAssetInput): NiaAsset => {
  const existing = getDemoRgbAssets()
  const assetId = generateRgbAssetId()
  const actualAmount = Number(input.amount) || 0
  const precision = Number(input.precision) || 0

  const newAsset: NiaAsset = {
    added_at: Math.floor(Date.now() / 1000),
    asset_id: assetId,
    balance: {
      future: actualAmount,
      offchain_inbound: 0,
      offchain_outbound: 0,
      settled: actualAmount,
      spendable: actualAmount,
    },
    issued_supply: actualAmount,
    name: input.name || 'Demo Asset',
    precision,
    ticker: (input.ticker || 'ASSET').toUpperCase().slice(0, 8),
    timestamp: Math.floor(Date.now() / 1000),
  }

  const updated = [newAsset, ...existing.filter((a) => a.asset_id !== assetId)]
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    logger.error('Failed to save demo asset to localStorage', e)
  }

  return newAsset
}

/**
 * Clear all simulated demo assets.
 */
export const clearDemoRgbAssets = (): void => {
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export interface DemoUtxo {
  outpoint: string
  btc_amount: number
  colorable: boolean
  rgb_allocations: any[]
  createdAt: number
}

/**
 * Retrieve all demo UTXOs from localStorage.
 */
export const getDemoUtxos = (): DemoUtxo[] => {
  try {
    const raw = localStorage.getItem(DEMO_UTXO_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Create and persist simulated colorable UTXOs in localStorage.
 */
export const saveDemoUtxos = (num: number, size: number): DemoUtxo[] => {
  const existing = getDemoUtxos()
  const chars = 'abcdef0123456789'
  const randHex = (len: number) =>
    Array.from({ length: len }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('')

  const newUtxos: DemoUtxo[] = Array.from({ length: num }, () => ({
    btc_amount: size,
    colorable: true,
    createdAt: Math.floor(Date.now() / 1000),
    outpoint: `${randHex(64)}:0`,
    rgb_allocations: [],
  }))

  const updated = [...newUtxos, ...existing]
  try {
    localStorage.setItem(DEMO_UTXO_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    logger.error('Failed to save demo UTXOs to localStorage', e)
  }
  return newUtxos
}

/**
 * Clear all simulated demo UTXOs.
 */
export const clearDemoUtxos = (): void => {
  try {
    localStorage.removeItem(DEMO_UTXO_STORAGE_KEY)
  } catch {
    // ignore
  }
}
