// ─── LICEX Marketplace Page ───────────────────────────────────────────────────
// Catalog of software licenses with filters, search, and grid/list views.

import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  Shield,
  ArrowRightLeft,
  Eye,
  Heart,
  Package,
  X,
  RefreshCw,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  setFilters,
  clearFilters,
  setViewMode,
  addToWatchlist,
  removeFromWatchlist,
  mergeRelayListings,
  mergeRelayOffers,
} from '../../slices/licex/licex.slice'
import { CATEGORIES } from '../../constants/licex-mock-data'
import type { LicenseListing, TransferPolicy } from '../../types/licex'
import type { NostrLicenseOffer } from '../../types/licexNostr'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'
import { cleanMarkdownForPreview } from '../../components/LicexMarkdown'
import {
  fetchMarketplaceSnapshot,
  getMarketplaceIdentity,
  publishMarketplacePurchaseRequest,
} from '../../services/licexNostrMarketplace'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { logger } from '../../utils/logger'
import {
  adjustP2PSimulationUsdtBalance,
  getP2PSimulationNodePubkey,
  getP2PSimulationUsdtBalance,
  isP2PSimulationEnabled,
} from '../../services/licexP2PSimulation'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatSats(sats: number): string {
  if (sats === 0) return 'Free'
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K sats`
  return `${sats.toLocaleString()} sats`
}

function transferPolicyLabel(policy: TransferPolicy): string {
  switch (policy) {
    case 'not_transferable':
      return 'Non-transferable'
    case 'transferable_with_approval':
      return 'Approval Required'
    case 'transferable_free':
      return 'Freely Transferable'
  }
}

function transferPolicyColor(policy: TransferPolicy): string {
  switch (policy) {
    case 'not_transferable':
      return 'text-red-400 bg-red-400/10'
    case 'transferable_with_approval':
      return 'text-yellow-400 bg-yellow-400/10'
    case 'transferable_free':
      return 'text-green-400 bg-green-400/10'
  }
}

import {
  Palette,
  ShieldCheck,
  Code2,
  BrainCircuit,
  ClipboardList,
  Gamepad2,
} from 'lucide-react'

function categoryIcon(category: string) {
  switch (category) {
    case 'Creative & Design':
      return <Palette size={20} strokeWidth={1.8} />
    case 'Security':
      return <ShieldCheck size={20} strokeWidth={1.8} />
    case 'Development':
      return <Code2 size={20} strokeWidth={1.8} />
    case 'Analytics & AI':
      return <BrainCircuit size={20} strokeWidth={1.8} />
    case 'Productivity':
      return <ClipboardList size={20} strokeWidth={1.8} />
    case 'Gaming':
      return <Gamepad2 size={20} strokeWidth={1.8} />
    default:
      return <Package size={20} strokeWidth={1.8} />
  }
}

// ── License Card ─────────────────────────────────────────────────────────────
const LicenseCard: React.FC<{
  listing: LicenseListing
  isWatchlisted: boolean
  onView: () => void
  onToggleWatchlist: () => void
}> = ({ listing, isWatchlisted, onView, onToggleWatchlist }) => {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden
                bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))]
                border border-[rgb(var(--app-border-primary))]/30
                cursor-pointer"
      id={`license-card-${listing.id}`}
      onClick={onView}
    >
      {/* Category gradient header */}
      <div className="h-28 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              listing.category === 'Creative & Design'
                ? 'linear-gradient(135deg, #9B5094, #8FB8DE)'
                : listing.category === 'Security'
                  ? 'linear-gradient(135deg, #8FB8DE, #CDF7F6)'
                  : listing.category === 'Development'
                    ? 'linear-gradient(135deg, #9A94BC, #8FB8DE)'
                    : listing.category === 'Analytics & AI'
                      ? 'linear-gradient(135deg, #9B5094, #9A94BC)'
                      : listing.category === 'Gaming'
                        ? 'linear-gradient(135deg, #CDF7F6, #9B5094)'
                        : 'linear-gradient(135deg, #8FB8DE, #9B5094)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--app-surface-secondary))]" />

        {/* Category + Edition badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-surface-base/90 backdrop-blur-sm text-content-primary border border-divider/40 shadow-sm flex items-center gap-1.5">
            {categoryIcon(listing.category)} {listing.category}
          </span>
        </div>

        {/* Watchlist heart */}
        <button
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200
            ${
              isWatchlisted
                ? 'bg-rose-500/20 text-rose-500'
                : 'bg-surface-base/80 text-content-secondary hover:text-rose-500 hover:bg-rose-500/10'
            } backdrop-blur-sm border border-divider/30 shadow-sm`}
          id={`watchlist-btn-${listing.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatchlist()
          }}
        >
          <Heart
            className="w-4 h-4"
            fill={isWatchlisted ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-2.5">
        {/* Company badge */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex-shrink-0" />
          <span className="text-xs text-[rgb(var(--app-content-secondary))] truncate">
            {listing.company.name}
          </span>
          {listing.company.companyStatus === 'verified' && (
            <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          )}
          {listing.status === 'published' &&
            listing.rgbAsset?.mode === 'rgb-node' && (
              <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                In vendita
              </span>
            )}
        </div>

        {/* Product name */}
        <h3 className="text-base font-semibold text-[rgb(var(--app-content-primary))] line-clamp-1 group-hover:text-purple-300 transition-colors">
          {listing.productName}
        </h3>

        {/* Edition + Version */}
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--app-content-secondary))]">
          <span className="px-2 py-0.5 rounded bg-[rgb(var(--app-surface-primary))]/50 border border-[rgb(var(--app-border-primary))]/20">
            {listing.edition}
          </span>
          <span>v{listing.version}</span>
          <span className="mx-1">·</span>
          <span>{listing.licenseType}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-[rgb(var(--app-content-secondary))] line-clamp-2 leading-relaxed">
          {cleanMarkdownForPreview(listing.productDescription)}
        </p>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1">
          {listing.platforms.slice(0, 3).map((p) => (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
              key={p}
            >
              {p}
            </span>
          ))}
          {listing.platforms.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
              +{listing.platforms.length - 3}
            </span>
          )}
        </div>

        {/* Transfer policy */}
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="w-3 h-3" />
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${transferPolicyColor(listing.transferPolicy)}`}
          >
            {transferPolicyLabel(listing.transferPolicy)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-[rgb(var(--app-border-primary))]/20" />

        {/* Price + Action */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-[rgb(var(--app-content-primary))]">
              {formatSats(listing.price)}
            </p>
            {listing.durationDays && (
              <p className="text-[10px] text-[rgb(var(--app-content-secondary))]">
                / {listing.durationDays} days
              </p>
            )}
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              bg-[#9B5094]/15 text-[#9B5094] dark:text-purple-300 dark:bg-purple-500/20 hover:bg-[#9B5094]/25 border border-[#9B5094]/30 dark:border-purple-500/30
              transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// ── License Row (list view) ──────────────────────────────────────────────────
const LicenseRow: React.FC<{
  listing: LicenseListing
  isWatchlisted: boolean
  onView: () => void
  onToggleWatchlist: () => void
}> = ({ listing, isWatchlisted, onView, onToggleWatchlist }) => {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden
  !transform-none !scale-100 !transition-none
  bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))]
  border border-[rgb(var(--app-border-primary))]/30
  cursor-pointer"
      onClick={onView}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
        bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20"
      >
        {categoryIcon(listing.category)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))] truncate group-hover:text-purple-300 transition-colors">
            {listing.productName}
          </h3>
          {listing.company.companyStatus === 'verified' && (
            <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          )}
          <span className="text-xs text-[rgb(var(--app-content-secondary))]">
            by {listing.company.name}
          </span>
        </div>
        <p className="text-xs text-[rgb(var(--app-content-secondary))] truncate mt-0.5">
          {listing.productDescription}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))]">
            {listing.edition} · v{listing.version}
          </span>
          {listing.status === 'published' &&
            listing.rgbAsset?.mode === 'rgb-node' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400">
                In vendita
              </span>
            )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${transferPolicyColor(listing.transferPolicy)}`}
          >
            {transferPolicyLabel(listing.transferPolicy)}
          </span>
          {listing.platforms.slice(0, 2).map((p) => (
            <span className="text-[10px] text-blue-300" key={p}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-base font-bold text-[rgb(var(--app-content-primary))]">
          {formatSats(listing.price)}
        </p>
        {listing.durationDays && (
          <p className="text-[10px] text-[rgb(var(--app-content-secondary))]">
            / {listing.durationDays} days
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className={`p-2 rounded-lg transition-all ${
            isWatchlisted
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-[rgb(var(--app-content-secondary))] hover:text-rose-400 hover:bg-rose-500/10'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatchlist()
          }}
        >
          <Heart
            className="w-4 h-4"
            fill={isWatchlisted ? 'currentColor' : 'none'}
          />
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-[#9B5094]/15 text-[#9B5094] dark:bg-purple-500/20 dark:text-purple-300 hover:bg-[#9B5094]/25 border border-[#9B5094]/30 dark:border-purple-500/30
            transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Filter Panel ─────────────────────────────────────────────────────────────
const FilterPanel: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch()
  const { filters } = useAppSelector((s) => s.licex)

  if (!isOpen) return null

  return (
    <div
      className="rounded-xl p-4 space-y-4
      bg-[rgb(var(--app-surface-secondary))]
      border border-[rgb(var(--app-border-primary))]/30
      animate-fadeIn"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
          Filters
        </h3>
        <button
          className="text-[rgb(var(--app-content-secondary))] hover:text-[rgb(var(--app-content-primary))]"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Category */}
        <div>
          <label className="text-xs text-[rgb(var(--app-content-secondary))] mb-1 block">
            Category
          </label>
          <select
            className="w-full text-xs rounded-lg px-3 py-2
              bg-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30
              text-[rgb(var(--app-content-primary))]
              focus:border-purple-500/50 focus:outline-none"
            onChange={(e) => dispatch(setFilters({ category: e.target.value }))}
            value={filters.category}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* License Type */}
        <div>
          <label className="text-xs text-[rgb(var(--app-content-secondary))] mb-1 block">
            License Type
          </label>
          <select
            className="w-full text-xs rounded-lg px-3 py-2
              bg-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30
              text-[rgb(var(--app-content-primary))]
              focus:border-purple-500/50 focus:outline-none"
            onChange={(e) =>
              dispatch(setFilters({ licenseType: e.target.value as any }))
            }
            value={filters.licenseType}
          >
            <option value="">All Types</option>
            <option value="perpetual">Perpetual</option>
            <option value="subscription">Subscription</option>
            <option value="trial">Trial</option>
            <option value="educational">Educational</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Transfer Policy */}
        <div>
          <label className="text-xs text-[rgb(var(--app-content-secondary))] mb-1 block">
            Transfer Policy
          </label>
          <select
            className="w-full text-xs rounded-lg px-3 py-2
              bg-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30
              text-[rgb(var(--app-content-primary))]
              focus:border-purple-500/50 focus:outline-none"
            onChange={(e) =>
              dispatch(setFilters({ transferPolicy: e.target.value as any }))
            }
            value={filters.transferPolicy}
          >
            <option value="">Any Policy</option>
            <option value="transferable_free">Freely Transferable</option>
            <option value="transferable_with_approval">
              Approval Required
            </option>
            <option value="not_transferable">Non-transferable</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs text-[rgb(var(--app-content-secondary))] mb-1 block">
            Sort By
          </label>
          <select
            className="w-full text-xs rounded-lg px-3 py-2
              bg-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30
              text-[rgb(var(--app-content-primary))]
              focus:border-purple-500/50 focus:outline-none"
            onChange={(e) =>
              dispatch(setFilters({ sortBy: e.target.value as any }))
            }
            value={filters.sortBy}
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      <button
        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        onClick={() => dispatch(clearFilters())}
      >
        Clear all filters
      </button>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function Component() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { filteredListings, filters, viewMode, watchlist } = useAppSelector(
    (s) => s.licex
  )
  const resaleOffers = useAppSelector((s) =>
    s.licex.p2pOffers.filter((offer) => offer.status === 'active')
  )
  const [showFilters, setShowFilters] = React.useState(false)
  const [relaySyncStatus, setRelaySyncStatus] = React.useState<
    'loading' | 'synced' | 'error'
  >('loading')
  const [relayListingCount, setRelayListingCount] = React.useState(0)

  const syncMarketplace = useCallback(async () => {
    setRelaySyncStatus('loading')
    try {
      const { listings: relayListings, offers: relayOffers } =
        await fetchMarketplaceSnapshot()
      dispatch(mergeRelayListings(relayListings))
      dispatch(mergeRelayOffers(relayOffers))
      setRelayListingCount(
        relayListings.filter((payload) => payload.status === 'published')
          .length +
          relayOffers.filter((offer) => offer.status === 'active').length
      )
      setRelaySyncStatus('synced')
    } catch (error) {
      logger.warn('[LICEX Marketplace] Relay sync failed:', error)
      setRelaySyncStatus('error')
    }
  }, [dispatch])

  useEffect(() => {
    void syncMarketplace()
  }, [syncMarketplace])

  const isWatchlisted = useCallback(
    (listingId: string) => watchlist.some((w) => w.listingId === listingId),
    [watchlist]
  )

  const toggleWatchlist = useCallback(
    (listingId: string) => {
      if (isWatchlisted(listingId)) {
        dispatch(removeFromWatchlist(listingId))
      } else {
        dispatch(addToWatchlist(listingId))
      }
    },
    [dispatch, isWatchlisted]
  )

  const activeFilterCount = [
    filters.category,
    filters.licenseType,
    filters.transferPolicy,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
              <Package className="w-7 h-7 inline-block mr-2 text-purple-400 -mt-1" />
              License Marketplace
            </h1>
            <p className="text-sm text-[rgb(var(--app-content-secondary))] mt-1">
              Discover, compare, and purchase software licenses as RGB assets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              aria-live="polite"
              className={`text-xs px-3 py-1.5 rounded-full border ${
                relaySyncStatus === 'synced'
                  ? 'text-green-400 bg-green-400/10 border-green-400/20'
                  : relaySyncStatus === 'error'
                    ? 'text-red-400 bg-red-400/10 border-red-400/20'
                    : 'text-[rgb(var(--app-content-secondary))] bg-[rgb(var(--app-surface-secondary))] border-[rgb(var(--app-border-primary))]/30'
              }`}
            >
              {relaySyncStatus === 'loading'
                ? 'Relay: sincronizzazione…'
                : relaySyncStatus === 'error'
                  ? 'Relay: non raggiungibili'
                  : `Relay: ${relayListingCount} inserzioni`}
            </div>
            <button
              aria-label="Sincronizza marketplace dai relay"
              className="p-2 rounded-lg text-[rgb(var(--app-content-secondary))] hover:text-purple-300 hover:bg-[rgb(var(--app-surface-secondary))] disabled:opacity-50"
              disabled={relaySyncStatus === 'loading'}
              onClick={() => void syncMarketplace()}
              title="Sincronizza dai Nostr Relay"
              type="button"
            >
              <RefreshCw
                className={`w-4 h-4 ${relaySyncStatus === 'loading' ? 'animate-spin' : ''}`}
              />
            </button>
            <span className="text-xs text-[rgb(var(--app-content-secondary))] bg-[rgb(var(--app-surface-secondary))] px-3 py-1.5 rounded-full">
              {filteredListings.length} license
              {filteredListings.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Search + Controls */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--app-content-secondary))]" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                bg-[rgb(var(--app-surface-secondary))]
                border border-[rgb(var(--app-border-primary))]/30
                text-[rgb(var(--app-content-primary))]
                placeholder-[rgb(var(--app-content-secondary))]/50
                focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20
                transition-all duration-200"
              id="marketplace-search"
              onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
              placeholder="Search licenses, publishers, categories..."
              type="text"
              value={filters.search}
            />
          </div>

          {/* Filter toggle */}
          <button
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              transition-all duration-200 border
              ${
                showFilters
                  ? 'bg-[#9B5094]/15 text-[#9B5094] dark:bg-purple-500/20 dark:text-purple-300 border-[#9B5094]/40 dark:border-purple-500/30'
                  : 'bg-[rgb(var(--app-surface-secondary))] text-[rgb(var(--app-content-secondary))] border-[rgb(var(--app-border-primary))]/30 hover:border-primary/50'
              }`}
            id="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#9B5094] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl overflow-hidden border border-divider/40">
            <button
              className={`p-2.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#9B5094]/15 text-[#9B5094] dark:bg-purple-500/20 dark:text-purple-300'
                  : 'bg-surface-overlay text-content-secondary hover:text-content-primary'
              }`}
              id="view-grid"
              onClick={() => dispatch(setViewMode('grid'))}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={`p-2.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-[#9B5094]/15 text-[#9B5094] dark:bg-purple-500/20 dark:text-purple-300'
                  : 'bg-surface-overlay text-content-secondary hover:text-content-primary'
              }`}
              id="view-list"
              onClick={() => dispatch(setViewMode('list'))}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <FilterPanel
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
        />
      </div>

      {/* Listings grid/list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-fadeIn">
            <Package className="w-16 h-16 text-[rgb(var(--app-content-secondary))]/30 mb-4" />
            <h3 className="text-lg font-semibold text-[rgb(var(--app-content-primary))] mb-1">
              No licenses found
            </h3>
            <p className="text-sm text-[rgb(var(--app-content-secondary))]">
              Try adjusting your search or filters
            </p>
            <button
              className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              onClick={() => dispatch(clearFilters())}
            >
              Clear all filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <LicenseCard
                isWatchlisted={isWatchlisted(listing.id)}
                key={listing.id}
                listing={listing}
                onToggleWatchlist={() => toggleWatchlist(listing.id)}
                onView={() =>
                  navigate(`${LICEX_MARKETPLACE_PATH}/${listing.id}`)
                }
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2 animate-fadeIn">
            {filteredListings.map((listing) => (
              <LicenseRow
                isWatchlisted={isWatchlisted(listing.id)}
                key={listing.id}
                listing={listing}
                onToggleWatchlist={() => toggleWatchlist(listing.id)}
                onView={() =>
                  navigate(`${LICEX_MARKETPLACE_PATH}/${listing.id}`)
                }
              />
            ))}
          </div>
        )}

        {resaleOffers.length > 0 && (
          <section
            aria-labelledby="resale-offers-heading"
            className="mt-8 space-y-4"
          >
            <div>
              <h2
                className="text-lg font-bold text-[rgb(var(--app-content-primary))]"
                id="resale-offers-heading"
              >
                Licenze usate in vendita
              </h2>
              <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-1">
                Offerte pubblicate dai proprietari tramite Nostr Relay.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resaleOffers.map((offer) => (
                <ResaleOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const ResaleOfferCard: React.FC<{ offer: NostrLicenseOffer }> = ({ offer }) => {
  const [taker] = nodeApi.useTakerMutation()
  const simulationEnabled = isP2PSimulationEnabled()
  // Older development offers may predate the explicit marker. A demo asset
  // must never fall through to the real RGB node flow.
  const isSimulationOffer =
    offer.simulation === true || offer.listing.rgbAsset?.mode === 'demo'
  const { data: nodeInfo } = nodeApi.endpoints.nodeInfo.useQuery(undefined, {
    skip: simulationEnabled && isSimulationOffer,
  })
  const { data: assets } = nodeApi.endpoints.listAssets.useQuery(undefined, {
    skip: simulationEnabled && isSimulationOffer,
  })
  const [isBuying, setIsBuying] = React.useState(false)
  const [purchaseMessage, setPurchaseMessage] = React.useState<string | null>(
    null
  )

  const buyAtomically = async () => {
    if (isBuying) return
    setIsBuying(true)
    setPurchaseMessage(null)
    try {
      if (!offer.swapString) {
        throw new Error('Questa offerta non contiene uno swap atomico valido.')
      }
      if (isSimulationOffer && !simulationEnabled) {
        throw new Error(
          'Attiva il portafoglio test per acquistare questa offerta demo.'
        )
      }
      if (!isSimulationOffer && !nodeInfo?.pubkey) {
        throw new Error('Connetti e sblocca il nodo RGB prima di acquistare.')
      }
      const buyerNpub = await getMarketplaceIdentity()
      if (!buyerNpub) {
        throw new Error('Acquisto disponibile dall’app desktop LICEX.')
      }
      if (buyerNpub === offer.sellerNpub) {
        throw new Error('Non puoi acquistare una tua offerta.')
      }

      const parts = offer.swapString.split('/')
      if (parts.length !== 6) throw new Error('Dati dello swap non validi.')
      const [qtyFrom, fromAsset, qtyTo, toAsset, timeout] = parts
      const usdtAsset = (assets?.nia ?? []).find(
        (asset) => asset.ticker === 'USDT'
      )
      const licenseAssetId = offer.listing.rgbAsset?.assetId
      const expectedUsdtAmount = isSimulationOffer
        ? Math.round(offer.resalePriceUsdt * 100)
        : usdtAsset
          ? Math.round(offer.resalePriceUsdt * 10 ** (usdtAsset.precision ?? 0))
          : 0
      if (
        !licenseAssetId ||
        (isSimulationOffer
          ? fromAsset !== 'demo-usdt'
          : !usdtAsset || fromAsset !== usdtAsset.asset_id) ||
        toAsset !== licenseAssetId ||
        !Number.isFinite(Number(qtyFrom)) ||
        Number(qtyFrom) !== expectedUsdtAmount ||
        Number(qtyTo) !== 1 ||
        !Number.isFinite(Number(timeout))
      ) {
        throw new Error(
          'Lo swap non corrisponde a prezzo e asset di questa offerta.'
        )
      }
      const expiresAt =
        new Date(offer.createdAt).getTime() + Number(timeout) * 1000
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error(
          'Questa offerta è scaduta. Chiedi al venditore di ripubblicarla.'
        )
      }

      if (isSimulationOffer) {
        if (getP2PSimulationUsdtBalance() < offer.resalePriceUsdt) {
          throw new Error(
            'Saldo demo USDT insufficiente. Attiva o ricarica il portafoglio test.'
          )
        }
      } else {
        await taker({ swapstring: offer.swapString }).unwrap()
      }
      const requestId = `purchase-${crypto.randomUUID()}`
      const buyerNodePubkey = isSimulationOffer
        ? getP2PSimulationNodePubkey()
        : nodeInfo!.pubkey
      const nostrEventId = await publishMarketplacePurchaseRequest({
        buyerNodePubkey,
        buyerNpub,
        createdAt: new Date().toISOString(),
        id: requestId,
        offerId: offer.id,
        status: 'pending',
        ...(isSimulationOffer ? { simulation: true } : {}),
      })
      if (!nostrEventId) {
        throw new Error(
          'Swap autorizzato nel nodo, ma richiesta non pubblicata sul relay. Riprova la sincronizzazione.'
        )
      }
      if (isSimulationOffer)
        adjustP2PSimulationUsdtBalance(-offer.resalePriceUsdt)
      setPurchaseMessage(
        isSimulationOffer
          ? 'Acquisto demo registrato sul relay. Il venditore deve completare la simulazione.'
          : 'Swap autorizzato. Il venditore ha ricevuto la richiesta di completamento.'
      )
    } catch (error) {
      setPurchaseMessage(
        error instanceof Error ? error.message : 'Acquisto non riuscito.'
      )
    } finally {
      setIsBuying(false)
    }
  }

  return (
    <article className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full px-2 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/20">
          Usata · rivendita P2P
        </span>
        <span className="text-sm font-bold text-[rgb(var(--app-content-primary))]">
          {offer.resalePriceUsdt.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}{' '}
          USDT
        </span>
      </div>
      {isSimulationOffer && (
        <span className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
          Simulazione · nessun trasferimento RGB reale
        </span>
      )}
      {isSimulationOffer && !simulationEnabled && (
        <p className="text-xs text-violet-200">
          Per acquistare, attiva prima il portafoglio test in “Le Mie Licenze”.
        </p>
      )}
      <div>
        <h3 className="font-semibold text-[rgb(var(--app-content-primary))]">
          {offer.listing.productName}
        </h3>
        <p className="text-xs text-[rgb(var(--app-content-secondary))]">
          {offer.listing.edition} · {offer.listing.company.name}
        </p>
      </div>
      <div className="border-t border-[rgb(var(--app-border-primary))]/20 pt-2 flex items-center justify-between text-xs text-[rgb(var(--app-content-secondary))]">
        <span>Venditore: {offer.sellerName}</span>
        <span>{offer.transferCount} trasferimenti</span>
      </div>
      <button
        className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
        disabled={
          isBuying ||
          !offer.swapString ||
          (isSimulationOffer && !simulationEnabled)
        }
        onClick={() => void buyAtomically()}
        type="button"
      >
        {isBuying
          ? 'Autorizzazione swap…'
          : isSimulationOffer
            ? simulationEnabled
              ? 'Acquista in simulazione'
              : 'Portafoglio test non attivo'
            : 'Acquista con swap atomico'}
      </button>
      {purchaseMessage && (
        <p className="text-xs text-[rgb(var(--app-content-secondary))]">
          {purchaseMessage}
        </p>
      )}
    </article>
  )
}

Component.displayName = 'LicexMarketplacePage'
