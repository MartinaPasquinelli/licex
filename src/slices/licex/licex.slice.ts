// ─── LICEX Redux Slice ────────────────────────────────────────────────────────
// Manages marketplace state: listings, watchlist, wishlist, price alerts,
// AI chat, and company dashboard. Uses mock data as initial state.

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { NostrLicenseOffer } from '../../types/licexNostr'

import type {
  LicenseAssetReference,
  LicenseListing,
  WatchlistItem,
  PriceAlert,
  WantedSoftwareRequest,
  ChatMessage,
  CompanyDashboardStats,
  LicenseRecord,
  Order,
  MarketplaceFilters,
  TransferPolicy,
} from '../../types/licex'
import {
  MOCK_LISTINGS,
  MOCK_WATCHLIST,
  MOCK_PRICE_ALERTS,
  MOCK_WISHLIST,
  MOCK_CHAT_MESSAGES,
  MOCK_COMPANY_STATS,
  MOCK_OWNED_LICENSES,
  MOCK_ORDERS,
  MOCK_NOSTR_OFFERS,
} from '../../constants/licex-mock-data'
import {
  loadLocalOwnedLicenses,
  saveLocalOwnedLicenses,
  loadLocalOrders,
  saveLocalOrders,
  loadLocalWatchlist,
  saveLocalWatchlist,
  loadLocalPriceAlerts,
  saveLocalPriceAlerts,
  loadLocalWishlist,
  saveLocalWishlist,
  loadLocalCompanyStats,
  saveLocalCompanyStats,
  loadLocalChatMessages,
  saveLocalChatMessages,
  loadLocalListings,
  saveLocalListings,
  resetLocalLicexDatabase,
} from '../../services/licex/licexStorage'

interface LicexState {
  listings: LicenseListing[]
  filteredListings: LicenseListing[]
  selectedListing: LicenseListing | null
  watchlist: WatchlistItem[]
  priceAlerts: PriceAlert[]
  wishlist: WantedSoftwareRequest[]
  chatMessages: ChatMessage[]
  chatLoading: boolean
  companyStats: CompanyDashboardStats
  ownedLicenses: LicenseRecord[]
  orders: Order[]
  p2pOffers: NostrLicenseOffer[]
  filters: MarketplaceFilters
  viewMode: 'grid' | 'list'
}

const initialFilters: MarketplaceFilters = {
  category: '',
  licenseType: '',
  platforms: [],
  priceMax: null,
  priceMin: null,
  search: '',
  sortBy: 'newest',
  transferPolicy: '',
}

const initialListings = loadLocalListings()
const initialWatchlist = loadLocalWatchlist()
const initialPriceAlerts = loadLocalPriceAlerts()
const initialWishlist = loadLocalWishlist()
const initialOwnedLicenses = loadLocalOwnedLicenses()
const initialOrders = loadLocalOrders()
const initialCompanyStats = loadLocalCompanyStats()
const initialChatMessages = loadLocalChatMessages()

const initialState: LicexState = {
  chatLoading: false,
  chatMessages: initialChatMessages,
  companyStats: initialCompanyStats,
  filteredListings: initialListings.filter((l) => l.status === 'published'),
  filters: initialFilters,
  listings: initialListings,
  orders: initialOrders,
  ownedLicenses: initialOwnedLicenses,
  p2pOffers: MOCK_NOSTR_OFFERS,
  priceAlerts: initialPriceAlerts,
  selectedListing: null,
  viewMode: 'grid',
  watchlist: initialWatchlist,
  wishlist: initialWishlist,
}

// Helper: apply filters and sorting to listings
function applyFilters(
  listings: LicenseListing[],
  filters: MarketplaceFilters
): LicenseListing[] {
  let result = listings.filter((l) => l.status === 'published')

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (l) =>
        l.productName.toLowerCase().includes(q) ||
        l.productDescription.toLowerCase().includes(q) ||
        l.company.name.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  if (filters.category) {
    result = result.filter((l) => l.category === filters.category)
  }

  if (filters.licenseType) {
    result = result.filter((l) => l.licenseType === filters.licenseType)
  }

  if (filters.transferPolicy) {
    result = result.filter((l) => l.transferPolicy === filters.transferPolicy)
  }

  if (filters.priceMin !== null) {
    result = result.filter((l) => l.price >= filters.priceMin!)
  }

  if (filters.priceMax !== null) {
    result = result.filter((l) => l.price <= filters.priceMax!)
  }

  if (filters.platforms.length > 0) {
    result = result.filter((l) =>
      filters.platforms.some((p) => l.platforms.includes(p))
    )
  }

  switch (filters.sortBy) {
    case 'price_asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'newest':
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      break
    case 'popular':
      // Mock: sort by tag count as a proxy for popularity
      result.sort((a, b) => b.tags.length - a.tags.length)
      break
  }

  return result
}

export const licexSlice = createSlice({
  initialState,
  name: 'licex',
  reducers: {
    
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatMessages.push(action.payload)
      saveLocalChatMessages(state.chatMessages)
    },

    // ── Price Alerts ───────────────────────────────────────────────────
addPriceAlert(
      state,
      action: PayloadAction<{ listingId: string; thresholdSats: number }>
    ) {
      const listing = state.listings.find(
        (l) => l.id === action.payload.listingId
      )
      if (listing) {
        state.priceAlerts.push({
          createdAt: new Date().toISOString(),
          id: `pa-${Date.now()}`,
          listing,
          listingId: action.payload.listingId,
          thresholdSats: action.payload.thresholdSats,
          triggered: false,
        })
        saveLocalPriceAlerts(state.priceAlerts)
      }
    },

    
    addToWatchlist(state, action: PayloadAction<string>) {
      const listing = state.listings.find((l) => l.id === action.payload)
      if (
        listing &&
        !state.watchlist.find((w) => w.listingId === action.payload)
      ) {
        state.watchlist.push({
          addedAt: new Date().toISOString(),
          id: `wl-${Date.now()}`,
          listing,
          listingId: action.payload,
        })
        saveLocalWatchlist(state.watchlist)
      }
    },

    // ── Wishlist ───────────────────────────────────────────────────────
addWishlistItem(
      state,
      action: PayloadAction<
        Omit<
          WantedSoftwareRequest,
          | 'id'
          | 'createdAt'
          | 'updatedAt'
          | 'matchCount'
          | 'pledgeTotal'
          | 'status'
        >
      >
    ) {
      state.wishlist.push({
        ...action.payload,
        createdAt: new Date().toISOString(),
        id: `wish-${Date.now()}`,
        matchCount: 0,
        pledgeTotal: 0,
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      })
      saveLocalWishlist(state.wishlist)
    },

    clearChatMessages(state) {
      state.chatMessages = []
      saveLocalChatMessages(state.chatMessages)
    },

    
    clearFilters(state) {
      state.filters = initialFilters
      state.filteredListings = applyFilters(state.listings, state.filters)
    },

    
completePurchase(
      state,
      action: PayloadAction<{ order: Order; licenseRecord: LicenseRecord }>
    ) {
      // Salva l'ordine in cima alla cronologia ordini
      state.orders.unshift(action.payload.order)
      // Aggiunge la licenza tra quelle possedute dall'utente
      state.ownedLicenses.unshift(action.payload.licenseRecord)
      // Salva persistentemente nel database locale
      saveLocalOrders(state.orders)
      saveLocalOwnedLicenses(state.ownedLicenses)
    },

    // ── Mint / Issue RGB License Listing ────────────────────────────────
mintLicenseListing(
      state,
      action: PayloadAction<{
        id: string
        rgbAsset: LicenseAssetReference
        productName: string
        edition: string
        price: number
        transferPolicy: TransferPolicy
        royaltyPercent: number
        category?: string
        platforms?: string[]
      }>
    ) {
      const newListing: LicenseListing = {
        category: action.payload.category || 'Development',
        company: state.listings[0]?.company || {
          companyStatus: 'verified',
          defaultRoyaltyPercent: action.payload.royaltyPercent,
          defaultTransferPolicy: action.payload.transferPolicy,
          description: 'Verified Issuer Node',
          domain: 'jetbrains.com',
          id: 'comp-1',
          logoUrl: '',
          name: 'JetBrains s.r.o.',
          refundPolicy: 'Standard 14-day policy',
        },
        companyId: 'comp-1',
        createdAt: new Date().toISOString(),
        durationDays: null,
        edition: action.payload.edition,
        id: action.payload.id,
        imageUrl: '',
        licenseType: 'perpetual',
        maxTransfers: null,
        minHoldingDays: null,
        paymentAsset: 'RGB-USDT (demo stablecoin)',
        platforms: action.payload.platforms || ['Windows', 'macOS', 'Linux'],
        price: action.payload.price,
        productDescription: `${action.payload.productName} (${action.payload.edition}) - Licenza software ufficiale emessa come asset RGB su Bitcoin.`,
        productName: action.payload.productName,
        rgbAsset: action.payload.rgbAsset,
        royaltyPercent: action.payload.royaltyPercent,
        status: 'published',
        tags: ['RGB Asset', 'Verified Issuer', 'Demo Mint'],
        transferPolicy: action.payload.transferPolicy,
        updatedAt: new Date().toISOString(),
        version: '2026.1',
      }

      state.listings.unshift(newListing)
      state.filteredListings = applyFilters(state.listings, state.filters)
      state.companyStats.totalListings += 1
      saveLocalListings(state.listings)
      saveLocalCompanyStats(state.companyStats)
    },

    removeFromWatchlist(state, action: PayloadAction<string>) {
      state.watchlist = state.watchlist.filter(
        (w) => w.listingId !== action.payload
      )
      saveLocalWatchlist(state.watchlist)
    },

    removePriceAlert(state, action: PayloadAction<string>) {
      state.priceAlerts = state.priceAlerts.filter(
        (a) => a.id !== action.payload
      )
      saveLocalPriceAlerts(state.priceAlerts)
    },

    removeWishlistItem(state, action: PayloadAction<string>) {
      state.wishlist = state.wishlist.filter((w) => w.id !== action.payload)
      saveLocalWishlist(state.wishlist)
    },

    // ── Local Database Reset ───────────────────────────────────────────
    resetDatabase(state) {
      resetLocalLicexDatabase()
      state.ownedLicenses = MOCK_OWNED_LICENSES
      state.orders = MOCK_ORDERS
      state.watchlist = MOCK_WATCHLIST
      state.priceAlerts = MOCK_PRICE_ALERTS
      state.wishlist = MOCK_WISHLIST
      state.companyStats = MOCK_COMPANY_STATS
      state.chatMessages = MOCK_CHAT_MESSAGES
      state.listings = MOCK_LISTINGS
      state.filteredListings = applyFilters(MOCK_LISTINGS, state.filters)
    },

    selectListing(state, action: PayloadAction<string | null>) {
      state.selectedListing = action.payload
        ? state.listings.find((l) => l.id === action.payload) || null
        : null
    },

    setChatLoading(state, action: PayloadAction<boolean>) {
      state.chatLoading = action.payload
    },

    // ── Filters ────────────────────────────────────────────────────────
setFilters(state, action: PayloadAction<Partial<MarketplaceFilters>>) {
      state.filters = { ...state.filters, ...action.payload }
      state.filteredListings = applyFilters(state.listings, state.filters)
    },

    
setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload
    },

    
    setOwnedLicenses(state, action: PayloadAction<LicenseRecord[]>) {
      state.ownedLicenses = action.payload
    },

    setPriceAlerts(state, action: PayloadAction<PriceAlert[]>) {
      state.priceAlerts = action.payload
    },

    setViewMode(state, action: PayloadAction<'grid' | 'list'>) {
      state.viewMode = action.payload
    },

    setWatchlist(state, action: PayloadAction<WatchlistItem[]>) {
      state.watchlist = action.payload
    },
    setWishlist(state, action: PayloadAction<WantedSoftwareRequest[]>) {
      state.wishlist = action.payload
    },
  },
})

export const {
  setFilters,
  clearFilters,
  setViewMode,
  selectListing,
  addToWatchlist,
  removeFromWatchlist,
  addPriceAlert,
  removePriceAlert,
  addWishlistItem,
  removeWishlistItem,
  setWatchlist,
  setWishlist,
  setPriceAlerts,
  addChatMessage,
  clearChatMessages,
  setChatLoading,
  completePurchase,
  setOwnedLicenses,
  setOrders,
  mintLicenseListing,
  resetDatabase,
} = licexSlice.actions
