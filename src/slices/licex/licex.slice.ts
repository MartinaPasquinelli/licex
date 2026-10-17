// ─── LICEX Redux Slice ────────────────────────────────────────────────────────
// Manages marketplace state: listings, watchlist, wishlist, price alerts,
// AI chat, and company dashboard. Uses mock data as initial state.

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

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
} from '../../constants/licex-mock-data'

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

const initialState: LicexState = {
  chatLoading: false,
  chatMessages: MOCK_CHAT_MESSAGES,
  companyStats: MOCK_COMPANY_STATS,
  filteredListings: MOCK_LISTINGS.filter((l) => l.status === 'published'),
  filters: initialFilters,
  listings: MOCK_LISTINGS,
  orders: MOCK_ORDERS,
  ownedLicenses: MOCK_OWNED_LICENSES,
  priceAlerts: MOCK_PRICE_ALERTS,
  selectedListing: null,
  viewMode: 'grid',
  watchlist: MOCK_WATCHLIST,
  wishlist: MOCK_WISHLIST,
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
    // ── AI Chat ────────────────────────────────────────────────────────
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatMessages.push(action.payload)
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
      }
    },

    // ── Watchlist ──────────────────────────────────────────────────────
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
    },

    clearFilters(state) {
      state.filters = initialFilters
      state.filteredListings = applyFilters(state.listings, state.filters)
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
    },

    recordDemoPurchase(
      state,
      action: PayloadAction<{ listingId: string; orderId: string }>
    ) {
      const listing = state.listings.find(
        (item) => item.id === action.payload.listingId
      )
      if (
        !listing ||
        state.orders.some((order) => order.id === action.payload.orderId)
      )
        return
      state.orders.unshift({
        buyerId: 'demo-buyer',
        companyId: listing.companyId,
        createdAt: new Date().toISOString(),
        id: action.payload.orderId,
        licexFee: Math.round(listing.price * 0.01),
        listing,
        listingId: listing.id,
        orderStatus: 'completed',
        paymentStatus: 'received',
        price: listing.price,
        royalty: Math.round(listing.price * (listing.royaltyPercent / 100)),
        sellerId: listing.companyId,
        type: 'primary',
      })
      state.ownedLicenses.unshift({
        activationStatus: 'not_supported',
        id: `owned-${action.payload.orderId}`,
        licenseStatus: 'active',
        listing,
        orderId: action.payload.orderId,
        transferCount: 0,
      })
    },

    removeFromWatchlist(state, action: PayloadAction<string>) {
      state.watchlist = state.watchlist.filter(
        (w) => w.listingId !== action.payload
      )
    },

    removePriceAlert(state, action: PayloadAction<string>) {
      state.priceAlerts = state.priceAlerts.filter(
        (a) => a.id !== action.payload
      )
    },

    removeWishlistItem(state, action: PayloadAction<string>) {
      state.wishlist = state.wishlist.filter((w) => w.id !== action.payload)
    },

    // ── Listing Detail ─────────────────────────────────────────────────
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
    setViewMode(state, action: PayloadAction<'grid' | 'list'>) {
      state.viewMode = action.payload
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
  addChatMessage,
  setChatLoading,
  mintLicenseListing,
  recordDemoPurchase,
} = licexSlice.actions
