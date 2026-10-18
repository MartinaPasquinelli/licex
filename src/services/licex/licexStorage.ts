// ─── LICEX Local Database Service ─────────────────────────────────────────────
// Manages local persistence for the user's private wallet state:
// - Owned RGB software licenses (with cryptographic seals and handshake info)
// - Order history & transaction receipts
// - Watchlist & custom price alerts
// - Wishlist & software requests
// - Publisher Company Stats & minted listings
// - AI Assistant Chat history
//
// Dual-layer architecture:
// 1. Synchronous fast local cache (localStorage) for instant initial render.
// 2. Tauri Native SQLite tables (database.sqlite) via rusqlite IPC invoke:
//    - LicexOwnedLicenses
//    - LicexOrders
//    - LicexUserData (key-value store for watchlist, wishlist, alerts, stats, chat)

import { logger } from '../../utils/logger'
import type {
  LicenseRecord,
  Order,
  WatchlistItem,
  PriceAlert,
  WantedSoftwareRequest,
  CompanyDashboardStats,
  ChatMessage,
  LicenseListing,
} from '../../types/licex'
import {
  MOCK_OWNED_LICENSES,
  MOCK_ORDERS,
  MOCK_WATCHLIST,
  MOCK_PRICE_ALERTS,
  MOCK_WISHLIST,
  MOCK_COMPANY_STATS,
  MOCK_CHAT_MESSAGES,
  MOCK_LISTINGS,
} from '../../constants/licex-mock-data'

const STORAGE_KEYS = {
  CHAT_MESSAGES: 'licex_local_db_chat_messages_v1',
  COMPANY_STATS: 'licex_local_db_company_stats_v1',
  LISTINGS: 'licex_local_db_listings_v1',
  ORDERS: 'licex_local_db_orders_v1',
  OWNED_LICENSES: 'licex_local_db_owned_licenses_v1',
  PRICE_ALERTS: 'licex_local_db_price_alerts_v1',
  WATCHLIST: 'licex_local_db_watchlist_v1',
  WISHLIST: 'licex_local_db_wishlist_v1',
} as const

function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    )
  } catch {
    return false
  }
}

function getItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw) as T
  } catch (err) {
    logger.warn(`[LicEX DB] Error reading ${key} from local storage:`, err)
    return defaultValue
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    logger.error(`[LicEX DB] Error writing ${key} to local storage:`, err)
  }
}

// ─── Tauri SQLite IPC Helpers ─────────────────────────────────────────────────

async function syncLicenseToSqlite(license: LicenseRecord): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('licex_save_owned_license', {
      activationStatus: license.activationStatus,
      createdAt: license.activatedAt || new Date().toISOString(),
      id: license.id,
      licenseStatus: license.licenseStatus,
      orderId: license.orderId,
      payload: JSON.stringify(license),
    })
  } catch {
    // Graceful fallback when outside Tauri runtime
  }
}

async function syncOrderToSqlite(order: Order): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('licex_save_order', {
      createdAt: order.createdAt || new Date().toISOString(),
      id: order.id,
      listingId: order.listingId,
      orderStatus: order.orderStatus,
      payload: JSON.stringify(order),
      paymentStatus: order.paymentStatus,
      price: Math.round(order.price || 0),
    })
  } catch {
    // Graceful fallback when outside Tauri runtime
  }
}

async function syncUserDataToSqlite(key: string, data: unknown): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('licex_set_user_data', {
      key,
      payload: JSON.stringify(data),
    })
  } catch {
    // Graceful fallback when outside Tauri runtime
  }
}

async function loadUserDataFromSqlite<T>(key: string): Promise<T | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string | null>('licex_get_user_data', { key })
    if (raw) {
      return JSON.parse(raw) as T
    }
  } catch {
    // Fallback
  }
  return null
}

export async function loadLicensesFromSqlite(): Promise<
  LicenseRecord[] | null
> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const rows = await invoke<Array<{ id: string; payload: string }>>(
      'licex_get_owned_licenses'
    )
    if (rows && rows.length > 0) {
      const parsed = rows.map((r) => JSON.parse(r.payload) as LicenseRecord)
      saveLocalOwnedLicenses(parsed)
      return parsed
    }
  } catch {
    // Fallback to local cache
  }
  return null
}

export async function loadOrdersFromSqlite(): Promise<Order[] | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const rows =
      await invoke<Array<{ id: string; payload: string }>>('licex_get_orders')
    if (rows && rows.length > 0) {
      const parsed = rows.map((r) => JSON.parse(r.payload) as Order)
      saveLocalOrders(parsed)
      return parsed
    }
  } catch {
    // Fallback to local cache
  }
  return null
}

export async function loadWatchlistFromSqlite(): Promise<
  WatchlistItem[] | null
> {
  const data = await loadUserDataFromSqlite<WatchlistItem[]>('watchlist')
  if (data) saveLocalWatchlist(data)
  return data
}

export async function loadWishlistFromSqlite(): Promise<
  WantedSoftwareRequest[] | null
> {
  const data = await loadUserDataFromSqlite<WantedSoftwareRequest[]>('wishlist')
  if (data) saveLocalWishlist(data)
  return data
}

export async function loadPriceAlertsFromSqlite(): Promise<
  PriceAlert[] | null
> {
  const data = await loadUserDataFromSqlite<PriceAlert[]>('price_alerts')
  if (data) saveLocalPriceAlerts(data)
  return data
}

// ─── Owned Licenses (Portafoglio Licenze RGB) ──────────────────────────────────

export function loadLocalOwnedLicenses(): LicenseRecord[] {
  if (!isLocalStorageAvailable()) return MOCK_OWNED_LICENSES
  const stored = getItem<LicenseRecord[] | null>(
    STORAGE_KEYS.OWNED_LICENSES,
    null
  )
  if (!stored) {
    setItem(STORAGE_KEYS.OWNED_LICENSES, MOCK_OWNED_LICENSES)
    MOCK_OWNED_LICENSES.forEach((lic) => {
      syncLicenseToSqlite(lic).catch(() => {})
    })
    return MOCK_OWNED_LICENSES
  }
  return stored
}

export function saveLocalOwnedLicenses(licenses: LicenseRecord[]): void {
  setItem(STORAGE_KEYS.OWNED_LICENSES, licenses)
  licenses.forEach((lic) => {
    syncLicenseToSqlite(lic).catch(() => {})
  })
}

// ─── Orders (Cronologia Ordini Personale) ──────────────────────────────────────

export function loadLocalOrders(): Order[] {
  if (!isLocalStorageAvailable()) return MOCK_ORDERS
  const stored = getItem<Order[] | null>(STORAGE_KEYS.ORDERS, null)
  if (!stored) {
    setItem(STORAGE_KEYS.ORDERS, MOCK_ORDERS)
    MOCK_ORDERS.forEach((ord) => {
      syncOrderToSqlite(ord).catch(() => {})
    })
    return MOCK_ORDERS
  }
  return stored
}

export function saveLocalOrders(orders: Order[]): void {
  setItem(STORAGE_KEYS.ORDERS, orders)
  orders.forEach((ord) => {
    syncOrderToSqlite(ord).catch(() => {})
  })
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export function loadLocalWatchlist(): WatchlistItem[] {
  if (!isLocalStorageAvailable()) return MOCK_WATCHLIST
  const stored = getItem<WatchlistItem[] | null>(STORAGE_KEYS.WATCHLIST, null)
  if (!stored) {
    setItem(STORAGE_KEYS.WATCHLIST, MOCK_WATCHLIST)
    syncUserDataToSqlite('watchlist', MOCK_WATCHLIST).catch(() => {})
    return MOCK_WATCHLIST
  }
  return stored
}

export function saveLocalWatchlist(watchlist: WatchlistItem[]): void {
  setItem(STORAGE_KEYS.WATCHLIST, watchlist)
  syncUserDataToSqlite('watchlist', watchlist).catch(() => {})
}

// ─── Price Alerts ─────────────────────────────────────────────────────────────

export function loadLocalPriceAlerts(): PriceAlert[] {
  if (!isLocalStorageAvailable()) return MOCK_PRICE_ALERTS
  const stored = getItem<PriceAlert[] | null>(STORAGE_KEYS.PRICE_ALERTS, null)
  if (!stored) {
    setItem(STORAGE_KEYS.PRICE_ALERTS, MOCK_PRICE_ALERTS)
    syncUserDataToSqlite('price_alerts', MOCK_PRICE_ALERTS).catch(() => {})
    return MOCK_PRICE_ALERTS
  }
  return stored
}

export function saveLocalPriceAlerts(alerts: PriceAlert[]): void {
  setItem(STORAGE_KEYS.PRICE_ALERTS, alerts)
  syncUserDataToSqlite('price_alerts', alerts).catch(() => {})
}

// ─── Wishlist (Wanted Software Requests) ──────────────────────────────────────

export function loadLocalWishlist(): WantedSoftwareRequest[] {
  if (!isLocalStorageAvailable()) return MOCK_WISHLIST
  const stored = getItem<WantedSoftwareRequest[] | null>(
    STORAGE_KEYS.WISHLIST,
    null
  )
  if (!stored) {
    setItem(STORAGE_KEYS.WISHLIST, MOCK_WISHLIST)
    syncUserDataToSqlite('wishlist', MOCK_WISHLIST).catch(() => {})
    return MOCK_WISHLIST
  }
  return stored
}

export function saveLocalWishlist(wishlist: WantedSoftwareRequest[]): void {
  setItem(STORAGE_KEYS.WISHLIST, wishlist)
  syncUserDataToSqlite('wishlist', wishlist).catch(() => {})
}

// ─── Company Stats (Publisher Dashboard) ──────────────────────────────────────

export function loadLocalCompanyStats(): CompanyDashboardStats {
  if (!isLocalStorageAvailable()) return MOCK_COMPANY_STATS
  const stored = getItem<CompanyDashboardStats | null>(
    STORAGE_KEYS.COMPANY_STATS,
    null
  )
  if (!stored) {
    setItem(STORAGE_KEYS.COMPANY_STATS, MOCK_COMPANY_STATS)
    syncUserDataToSqlite('company_stats', MOCK_COMPANY_STATS).catch(() => {})
    return MOCK_COMPANY_STATS
  }
  return stored
}

export function saveLocalCompanyStats(stats: CompanyDashboardStats): void {
  setItem(STORAGE_KEYS.COMPANY_STATS, stats)
  syncUserDataToSqlite('company_stats', stats).catch(() => {})
}

// ─── Chat Messages (AI Assistant) ─────────────────────────────────────────────

export function loadLocalChatMessages(): ChatMessage[] {
  if (!isLocalStorageAvailable()) return MOCK_CHAT_MESSAGES
  const stored = getItem<ChatMessage[] | null>(STORAGE_KEYS.CHAT_MESSAGES, null)
  if (!stored) {
    setItem(STORAGE_KEYS.CHAT_MESSAGES, MOCK_CHAT_MESSAGES)
    syncUserDataToSqlite('chat_messages', MOCK_CHAT_MESSAGES).catch(() => {})
    return MOCK_CHAT_MESSAGES
  }
  return stored
}

export function saveLocalChatMessages(messages: ChatMessage[]): void {
  setItem(STORAGE_KEYS.CHAT_MESSAGES, messages)
  syncUserDataToSqlite('chat_messages', messages).catch(() => {})
}

// ─── Listings (Catalogo Licenze Locale) ────────────────────────────────────────

export function loadLocalListings(): LicenseListing[] {
  if (!isLocalStorageAvailable()) return MOCK_LISTINGS
  const stored = getItem<LicenseListing[] | null>(STORAGE_KEYS.LISTINGS, null)
  if (!stored) {
    setItem(STORAGE_KEYS.LISTINGS, MOCK_LISTINGS)
    syncUserDataToSqlite('listings', MOCK_LISTINGS).catch(() => {})
    return MOCK_LISTINGS
  }
  return stored
}

export function saveLocalListings(listings: LicenseListing[]): void {
  setItem(STORAGE_KEYS.LISTINGS, listings)
  syncUserDataToSqlite('listings', listings).catch(() => {})
}

// ─── Utility: Reset, Export, Import ───────────────────────────────────────────

export function resetLocalLicexDatabase(): void {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.OWNED_LICENSES)
      window.localStorage.removeItem(STORAGE_KEYS.ORDERS)
      window.localStorage.removeItem(STORAGE_KEYS.WATCHLIST)
      window.localStorage.removeItem(STORAGE_KEYS.PRICE_ALERTS)
      window.localStorage.removeItem(STORAGE_KEYS.WISHLIST)
      window.localStorage.removeItem(STORAGE_KEYS.COMPANY_STATS)
      window.localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES)
      window.localStorage.removeItem(STORAGE_KEYS.LISTINGS)
    } catch (err) {
      logger.error('[LicEX DB] Error resetting database:', err)
    }
  }

  // Svuota anche le tabelle SQLite native
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke('licex_reset_database'))
    .catch(() => {})
}

export function exportLocalDatabase(): string {
  const data = {
    chatMessages: loadLocalChatMessages(),
    companyStats: loadLocalCompanyStats(),
    exportedAt: new Date().toISOString(),
    listings: loadLocalListings(),
    orders: loadLocalOrders(),
    ownedLicenses: loadLocalOwnedLicenses(),
    priceAlerts: loadLocalPriceAlerts(),
    version: '1.0.0',
    watchlist: loadLocalWatchlist(),
    wishlist: loadLocalWishlist(),
  }
  return JSON.stringify(data, null, 2)
}

export function importLocalDatabase(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent)
    if (data.ownedLicenses) saveLocalOwnedLicenses(data.ownedLicenses)
    if (data.orders) saveLocalOrders(data.orders)
    if (data.watchlist) saveLocalWatchlist(data.watchlist)
    if (data.priceAlerts) saveLocalPriceAlerts(data.priceAlerts)
    if (data.wishlist) saveLocalWishlist(data.wishlist)
    if (data.companyStats) saveLocalCompanyStats(data.companyStats)
    if (data.chatMessages) saveLocalChatMessages(data.chatMessages)
    if (data.listings) saveLocalListings(data.listings)
    return true
  } catch (err) {
    logger.error('[LicEX DB] Error importing database:', err)
    return false
  }
}
