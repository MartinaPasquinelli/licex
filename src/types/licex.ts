// ─── LICEX Domain Types ───────────────────────────────────────────────────────
// Based on the data model in docs/ENG_requirements_and_backlog.md Section 3.

// ── Company ──────────────────────────────────────────────────────────────────
export type CompanyStatus = 'pending' | 'verified' | 'suspended' | 'rejected'

export interface Company {
  id: string
  name: string
  domain: string
  logoUrl: string
  description: string
  companyStatus: CompanyStatus
  refundPolicy: string
  defaultTransferPolicy: TransferPolicy
  defaultRoyaltyPercent: number
  verifiedAt?: string
}

// ── Transfer Policy ──────────────────────────────────────────────────────────
export type TransferPolicy =
  'not_transferable' | 'transferable_with_approval' | 'transferable_free'

export type LicenseAssetMode = 'demo' | 'rgb-node'

export interface LicenseAssetReference {
  assetId: string
  contractId: string
  metadataHash: string
  schema: 'UDA' | 'NIA'
  status: RgbAssetStatus
  mode: LicenseAssetMode
  issuedAt: string
}

// ── License Listing ──────────────────────────────────────────────────────────
export type ListingStatus =
  'draft' | 'pending_review' | 'published' | 'suspended' | 'rejected'

export type LicenseType =
  'perpetual' | 'subscription' | 'trial' | 'educational' | 'enterprise'

export interface LicenseListing {
  id: string
  companyId: string
  company: Company
  productName: string
  productDescription: string
  edition: string
  version: string
  category: string
  platforms: string[]
  licenseType: LicenseType
  durationDays: number | null // null = perpetual
  price: number // in sats
  paymentAsset: string
  transferPolicy: TransferPolicy
  royaltyPercent: number
  maxTransfers: number | null
  minHoldingDays: number | null
  status: ListingStatus
  imageUrl: string
  tags: string[]
  createdAt: string
  updatedAt: string
  rgbAsset?: LicenseAssetReference
}

// ── RGB Asset ────────────────────────────────────────────────────────────────
export type RgbAssetStatus =
  | 'not_created'
  | 'issued'
  | 'transfer_pending'
  | 'transferred'
  | 'validation_error'

// ── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus =
  'not_started' | 'pending' | 'received' | 'failed' | 'refunded'

// ── License Status ───────────────────────────────────────────────────────────
export type LicenseStatus = 'active' | 'revoked' | 'expired'

export type ActivationStatus =
  'unknown' | 'pending' | 'confirmed' | 'failed' | 'not_supported'

// ── AI Review ────────────────────────────────────────────────────────────────
export type AiReviewStatus = 'not_started' | 'analyzed' | 'flagged' | 'failed'

// ── Order ────────────────────────────────────────────────────────────────────
export type OrderType = 'primary' | 'resale'
export type OrderStatus =
  | 'prepared'
  | 'pending'
  | 'sent'
  | 'received'
  | 'validated'
  | 'completed'
  | 'failed'
  | 'reconciliation_required'

export interface Order {
  id: string
  buyerId: string
  sellerId: string
  companyId: string
  listingId: string
  listing: LicenseListing
  type: OrderType
  price: number
  licexFee: number
  royalty: number
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  createdAt: string
}

// ── License Record ───────────────────────────────────────────────────────────
export interface LicenseRecord {
  id: string
  orderId: string
  listing: LicenseListing
  licenseStatus: LicenseStatus
  activationStatus: ActivationStatus
  activatedAt?: string
  transferCount: number
}

// ── Watchlist & Price Alert ──────────────────────────────────────────────────
export interface WatchlistItem {
  id: string
  listingId: string
  listing: LicenseListing
  addedAt: string
}

export interface PriceAlert {
  id: string
  listingId: string
  listing: LicenseListing
  thresholdSats: number
  triggered: boolean
  triggeredAt?: string
  createdAt: string
}

// ── Wanted Software Request ─────────────────────────────────────────────────
export type WishlistStatus =
  'submitted' | 'matched' | 'pledged' | 'fulfilled' | 'expired'

export interface WantedSoftwareRequest {
  id: string
  title: string
  description: string
  useCase: string
  platforms: string[]
  requirements: string[]
  budget: number | null // sats
  status: WishlistStatus
  matchCount: number
  pledgeTotal: number
  consentToAggregation: boolean
  createdAt: string
  updatedAt: string
}

// ── AI Assistant ─────────────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
  suggestions?: string[]
}

// ── Company Dashboard Stats ──────────────────────────────────────────────────
export interface CompanyDashboardStats {
  totalListings: number
  totalSales: number
  totalRevenueSats: number
  activeLicenses: number
  pendingActivations: number
  refundsIssued: number
  averageRating: number
  monthlySales: { month: string; sales: number; revenue: number }[]
}

// ── Filter/Search ────────────────────────────────────────────────────────────
export interface MarketplaceFilters {
  search: string
  category: string
  priceMin: number | null
  priceMax: number | null
  licenseType: LicenseType | ''
  transferPolicy: TransferPolicy | ''
  platforms: string[]
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular'
}
