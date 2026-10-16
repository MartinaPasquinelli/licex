// ─── LICEX License Detail Page ────────────────────────────────────────────────
// Full details for a single license listing with purchase action.

import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Shield,
  ArrowRightLeft,
  Heart,
  ShoppingCart,
  Clock,
  Globe,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  addToWatchlist,
  removeFromWatchlist,
  addPriceAlert,
} from '../../slices/licex/licex.slice'
import type { TransferPolicy } from '../../types/licex'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'

function formatSats(sats: number): string {
  if (sats === 0) return 'Free'
  return `${sats.toLocaleString()} sats`
}

function transferPolicyLabel(policy: TransferPolicy): string {
  switch (policy) {
    case 'not_transferable':
      return 'Non-transferable'
    case 'transferable_with_approval':
      return 'Transferable (Approval Required)'
    case 'transferable_free':
      return 'Freely Transferable'
  }
}

function transferPolicyDescription(policy: TransferPolicy): string {
  switch (policy) {
    case 'not_transferable':
      return 'This license is tied to the original buyer. It cannot be resold or transferred to another user.'
    case 'transferable_with_approval':
      return 'This license can be resold, but each transfer requires explicit approval from the issuing company.'
    case 'transferable_free':
      return 'This license can be freely resold. The company will be notified and will reassign activation after transfer.'
  }
}

function categoryIcon(category: string): string {
  switch (category) {
    case 'Creative & Design':
      return '🎨'
    case 'Security':
      return '🛡️'
    case 'Development':
      return '⚙️'
    case 'Analytics & AI':
      return '🧠'
    case 'Productivity':
      return '📋'
    case 'Gaming':
      return '🎮'
    default:
      return '📦'
  }
}

export function Component() {
  const { licenseId } = useParams<{ licenseId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { listings, watchlist } = useAppSelector((s) => s.licex)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState('')

  const listing = useMemo(
    () => listings.find((l) => l.id === licenseId),
    [listings, licenseId]
  )

  const isWatchlisted = useMemo(
    () => watchlist.some((w) => w.listingId === licenseId),
    [watchlist, licenseId]
  )

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg text-[rgb(var(--app-content-secondary))]">
          License not found
        </p>
        <button
          className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
          onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
        >
          ← Back to Marketplace
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
        {/* Back button */}
        <button
          className="flex items-center gap-2 text-sm text-[rgb(var(--app-content-secondary))] hover:text-purple-300 transition-colors"
          id="back-to-marketplace"
          onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div
              className="rounded-2xl overflow-hidden
              bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30"
            >
              {/* Banner */}
              <div className="h-40 relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      listing.category === 'Creative & Design'
                        ? 'linear-gradient(135deg, #9365FF, #FF6B9D)'
                        : listing.category === 'Security'
                          ? 'linear-gradient(135deg, #15E99A, #3B82F6)'
                          : listing.category === 'Development'
                            ? 'linear-gradient(135deg, #3B82F6, #8FD5EA)'
                            : listing.category === 'Analytics & AI'
                              ? 'linear-gradient(135deg, #FF6B9D, #FFA726)'
                              : listing.category === 'Gaming'
                                ? 'linear-gradient(135deg, #F43F5E, #9365FF)'
                                : 'linear-gradient(135deg, #8FD5EA, #15E99A)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--app-surface-secondary))]" />
                <div className="absolute bottom-4 left-6 text-6xl opacity-50">
                  {categoryIcon(listing.category)}
                </div>
              </div>

              <div className="p-6 space-y-4 -mt-6 relative">
                {/* Company */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[rgb(var(--app-content-primary))]">
                        {listing.company.name}
                      </span>
                      {listing.company.companyStatus === 'verified' && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          <Shield className="w-3 h-3" />
                          Verified Seller
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                      {listing.company.domain}
                    </span>
                  </div>
                </div>

                {/* Product name & edition */}
                <div>
                  <h1 className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
                    {listing.productName}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                      {listing.edition}
                    </span>
                    <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                      v{listing.version}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[rgb(var(--app-surface-primary))]/50 text-[rgb(var(--app-content-secondary))]">
                      {listing.licenseType}
                    </span>
                    <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                      {listing.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[rgb(var(--app-content-secondary))] leading-relaxed">
                  {listing.productDescription}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {listing.tags.map((tag) => (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--app-surface-primary))]/50 text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/20"
                      key={tag}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platforms */}
              <div
                className="rounded-xl p-4
                bg-[rgb(var(--app-surface-secondary))]/50
                border border-[rgb(var(--app-border-primary))]/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                    Platforms
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.platforms.map((p) => (
                    <span
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      key={p}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div
                className="rounded-xl p-4
                bg-[rgb(var(--app-surface-secondary))]/50
                border border-[rgb(var(--app-border-primary))]/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                    Duration
                  </h3>
                </div>
                <p className="text-sm text-[rgb(var(--app-content-secondary))]">
                  {listing.durationDays
                    ? `${listing.durationDays} days (${Math.round(listing.durationDays / 30)} months)`
                    : 'Perpetual — no expiration'}
                </p>
              </div>

              {/* Transfer Policy */}
              <div
                className="rounded-xl p-4
                bg-[rgb(var(--app-surface-secondary))]/50
                border border-[rgb(var(--app-border-primary))]/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                    Transfer Policy
                  </h3>
                </div>
                <p className="text-xs font-medium text-purple-300 mb-1">
                  {transferPolicyLabel(listing.transferPolicy)}
                </p>
                <p className="text-xs text-[rgb(var(--app-content-secondary))] leading-relaxed">
                  {transferPolicyDescription(listing.transferPolicy)}
                </p>
                {listing.royaltyPercent > 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚡ {listing.royaltyPercent}% royalty on resales
                  </p>
                )}
                {listing.maxTransfers && (
                  <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-1">
                    Max {listing.maxTransfers} transfers allowed
                  </p>
                )}
                {listing.minHoldingDays && (
                  <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-1">
                    Min {listing.minHoldingDays}-day holding period
                  </p>
                )}
              </div>

              {/* Refund Policy */}
              <div
                className="rounded-xl p-4
                bg-[rgb(var(--app-surface-secondary))]/50
                border border-[rgb(var(--app-border-primary))]/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                    Refund Policy
                  </h3>
                </div>
                <p className="text-sm text-[rgb(var(--app-content-secondary))]">
                  {listing.company.refundPolicy}
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div
              className="rounded-xl p-4 space-y-3
              bg-[rgb(var(--app-surface-secondary))]/50
              border border-[rgb(var(--app-border-primary))]/20"
            >
              <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                Verification Status
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified Seller
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  License Signed by Issuer
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Info className="w-3.5 h-3.5" />
                  RGB Asset: Demo Mode
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Info className="w-3.5 h-3.5" />
                  Activation: Simulated
                </span>
              </div>
              <p className="text-[10px] text-[rgb(var(--app-content-secondary))]/60 italic">
                Status labels follow LICEX verification principles. AI analysis
                and RGB transfers are simulated in this demo.
              </p>
            </div>
          </div>

          {/* Right column - Purchase card */}
          <div className="space-y-4">
            {/* Price card */}
            <div
              className="rounded-2xl p-6 space-y-5 sticky top-6
              bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))]
              border border-[rgb(var(--app-border-primary))]/30
              shadow-xl shadow-purple-500/5"
            >
              <div>
                <p className="text-sm text-[rgb(var(--app-content-secondary))]">
                  Price
                </p>
                <p className="text-3xl font-bold text-[rgb(var(--app-content-primary))] mt-1">
                  {formatSats(listing.price)}
                </p>
                <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-0.5">
                  Payment: {listing.paymentAsset}
                  {listing.durationDays && ` · ${listing.durationDays} days`}
                </p>
              </div>

              {/* Purchase button */}
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold
                  bg-gradient-to-r from-purple-600 to-purple-500 text-white
                  hover:from-purple-500 hover:to-purple-400
                  shadow-lg shadow-purple-500/25
                  transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5
                  active:translate-y-0"
                id="purchase-button"
                onClick={() => setShowPurchaseModal(true)}
              >
                <ShoppingCart className="w-4 h-4" />
                {listing.price === 0 ? 'Get for Free' : 'Purchase License'}
              </button>

              {/* Watchlist button */}
              <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                  border transition-all duration-200
                  ${
                    isWatchlisted
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      : 'bg-transparent text-[rgb(var(--app-content-secondary))] border-[rgb(var(--app-border-primary))]/30 hover:border-rose-500/30 hover:text-rose-400'
                  }`}
                id="watchlist-detail-btn"
                onClick={() => {
                  if (isWatchlisted) dispatch(removeFromWatchlist(listing.id))
                  else dispatch(addToWatchlist(listing.id))
                }}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isWatchlisted ? 'currentColor' : 'none'}
                />
                {isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
              </button>

              {/* Price alert */}
              <div className="border-t border-[rgb(var(--app-border-primary))]/20 pt-4 space-y-2">
                <p className="text-xs font-medium text-[rgb(var(--app-content-primary))]">
                  Set Price Alert
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 text-xs px-3 py-2 rounded-lg
                      bg-[rgb(var(--app-surface-primary))]
                      border border-[rgb(var(--app-border-primary))]/30
                      text-[rgb(var(--app-content-primary))]
                      placeholder-[rgb(var(--app-content-secondary))]/50
                      focus:border-purple-500/50 focus:outline-none"
                    id="price-alert-input"
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder="Threshold (sats)"
                    type="number"
                    value={alertThreshold}
                  />
                  <button
                    className="px-3 py-2 rounded-lg text-xs font-medium
                      bg-cyan-500/10 text-cyan-400 border border-cyan-500/20
                      hover:bg-cyan-500/20 transition-all"
                    id="set-alert-btn"
                    onClick={() => {
                      if (alertThreshold) {
                        dispatch(
                          addPriceAlert({
                            listingId: listing.id,
                            thresholdSats: parseInt(alertThreshold),
                          })
                        )
                        setAlertThreshold('')
                      }
                    }}
                  >
                    Set
                  </button>
                </div>
              </div>

              {/* Info notes */}
              <div className="space-y-2 pt-2">
                <div className="flex items-start gap-2 text-[10px] text-[rgb(var(--app-content-secondary))]">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-400/60" />
                  <span>
                    Explicit confirmation required before any signature or
                    transaction
                  </span>
                </div>
                <div className="flex items-start gap-2 text-[10px] text-[rgb(var(--app-content-secondary))]">
                  <Shield className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-400/60" />
                  <span>
                    Non-custodial: LICEX does not hold your keys or funds
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo purchase modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[rgb(var(--app-surface-secondary))] rounded-2xl p-6 max-w-md w-full mx-4 border border-[rgb(var(--app-border-primary))]/30 shadow-2xl space-y-4 animate-scaleIn">
              <h2 className="text-lg font-bold text-[rgb(var(--app-content-primary))]">
                Purchase Confirmation
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--app-content-secondary))]">
                    Product
                  </span>
                  <span className="text-[rgb(var(--app-content-primary))] font-medium">
                    {listing.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--app-content-secondary))]">
                    Price
                  </span>
                  <span className="text-[rgb(var(--app-content-primary))] font-medium">
                    {formatSats(listing.price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--app-content-secondary))]">
                    LICEX Fee (1%)
                  </span>
                  <span className="text-[rgb(var(--app-content-primary))]">
                    {formatSats(Math.round(listing.price * 0.01))}
                  </span>
                </div>
                <div className="border-t border-[rgb(var(--app-border-primary))]/20 pt-2 flex justify-between">
                  <span className="text-[rgb(var(--app-content-primary))] font-semibold">
                    Total
                  </span>
                  <span className="text-[rgb(var(--app-content-primary))] font-bold">
                    {formatSats(
                      listing.price + Math.round(listing.price * 0.01)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300/80">
                  <strong>Demo Mode:</strong> This is a simulated purchase. In
                  the full version, this will perform an RGB atomic swap on
                  Mutinynet.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium
                    bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))]
                    border border-[rgb(var(--app-border-primary))]/30
                    hover:text-[rgb(var(--app-content-primary))] transition-all"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                    bg-gradient-to-r from-purple-600 to-purple-500 text-white
                    hover:from-purple-500 hover:to-purple-400
                    shadow-lg shadow-purple-500/25 transition-all"
                  id="confirm-purchase-btn"
                  onClick={() => {
                    setShowPurchaseModal(false)
                    // Demo: just close
                  }}
                >
                  Confirm Purchase (Demo)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

Component.displayName = 'LicexLicenseDetailPage'
