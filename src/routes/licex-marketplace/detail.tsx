// ─── LICEX License Detail Page ────────────────────────────────────────────────
// Full details for a single license listing with purchase action.

import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
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
  Info,
  User,
  Lock,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  addToWatchlist,
  removeFromWatchlist,
  addPriceAlert,
  recordDemoPurchase,
} from '../../slices/licex/licex.slice'
import type { TransferPolicy } from '../../types/licex'
import {
  LICEX_MARKETPLACE_PATH,
  ACCOUNT_PATH,
  WALLET_SETUP_PATH,
} from '../../app/router/paths'

import { calculatePaymentQuote, formatUstd } from '../../helpers/licexPayments'
import {
  executeLicenseSwap,
  type SwapStep,
  type SwapExecutionResult,
} from '../../services/licexPaymentService'
import { completePurchase } from '../../slices/licex/licex.slice'

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
      return '    s🎮'
    default:
      return '📦'
  }
}

export function Component() {
  const { licenseId } = useParams<{ licenseId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { listings, watchlist } = useAppSelector((s) => s.licex)
  const nodeSettingsData = useAppSelector((s) => s.nodeSettings.data)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState('')

  const hasAccount = Boolean(
    nodeSettingsData?.name || localStorage.getItem('licex_account_email')
  )

  const listing = useMemo(
    () => listings.find((l) => l.id === licenseId),
    [listings, licenseId]
  )

  const [swapStep, setSwapStep] = useState<SwapStep>('quote')
  const [swapMessage, setSwapMessage] = useState('')
  const [swapResult, setSwapResult] = useState<SwapExecutionResult | null>(null)
  const quote = useMemo(
    () => (listing ? calculatePaymentQuote(listing, 'primary') : null),
    [listing]
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
                  {formatUstd(listing.price)}
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
                onClick={() => {
                  if (!hasAccount) {
                    setShowAuthModal(true)
                  } else {
                    setShowPurchaseModal(true)
                  }
                }}
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
        {/* Modale di Checkout con Atomic Swap in RGB-USDT */}
        {showPurchaseModal && quote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn p-4">
            <div className="bg-[#1a1c2c] rounded-2xl max-w-lg w-full border border-[#9a94bc]/30 shadow-2xl p-6 space-y-5 animate-scaleIn text-white">
              {/* Intestazione */}
              <div className="flex items-center justify-between border-b border-[#9a94bc]/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center text-[#10b981] font-bold text-xs">
                    ₮
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {swapStep === 'completed'
                        ? 'Licenza Acquisita!'
                        : 'Checkout Atomic Swap (RGB-USDT)'}
                    </h2>
                    <p className="text-xs text-[#9a94bc]">
                      Protocollo di Scambio RGB su Bitcoin
                    </p>
                  </div>
                </div>
                {swapStep !== 'completed' &&
                  swapStep !== 'signing' &&
                  swapStep !== 'broadcasting' &&
                  swapStep !== 'proof_of_holding' && (
                    <button
                      className="text-[#9a94bc] hover:text-white text-sm"
                      onClick={() => setShowPurchaseModal(false)}
                    >
                      ✕
                    </button>
                  )}
              </div>

              {/* FASE 1: RIEPILOGO FINANZIARIO */}
              {swapStep === 'quote' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/30 border border-[#9a94bc]/20 space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#9a94bc]">Software</span>
                      <span className="font-semibold text-white">
                        {listing.productName} ({listing.edition})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9a94bc]">Prezzo Licenza</span>
                      <span className="font-semibold text-[#cdf7f6]">
                        {quote.formattedPrice}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9a94bc]">
                        Protocol Fee LICEX (1%)
                      </span>
                      <span className="text-white">{quote.formattedFee}</span>
                    </div>
                    <div className="border-t border-[#9a94bc]/20 pt-2 flex justify-between font-bold text-base">
                      <span>Totale da Pagare</span>
                      <span className="text-[#10b981]">
                        {quote.formattedTotal}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#8fb8de]/10 border border-[#8fb8de]/20 flex items-start gap-2.5 text-xs text-[#8fb8de]">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#10b981]" />
                    <span>
                      <strong>Scambio Atomico Non-Custodial:</strong> Gli USDT e
                      la Licenza UDA RGB25 si scambiano simultaneamente nello
                      stesso blocco Bitcoin. Nessun rischio di mancata consegna.
                    </span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-black/40 text-[#9a94bc] border border-[#9a94bc]/20 hover:text-white"
                      onClick={() => setShowPurchaseModal(false)}
                    >
                      Annulla
                    </button>
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#9b5094] to-[#8fb8de] text-white hover:opacity-90 shadow-lg shadow-[#9b5094]/30"
                      id="confirm-atomic-swap-btn"
                      onClick={async () => {
                        try {
                          const result = await executeLicenseSwap(
                            listing,
                            'primary',
                            (step, msg) => {
                              setSwapStep(step)
                              if (msg) setSwapMessage(msg)
                            }
                          )
                          setSwapResult(result)
                          dispatch(
                            completePurchase({
                              licenseRecord: result.licenseRecord,
                              order: result.order,
                            })
                          )
                        } catch (_e) {
                          setSwapStep('error')
                        }
                      }}
                    >
                      Conferma & Paga {quote.formattedTotal}
                    </button>
                  </div>
                </div>
              )}

              {/* FASE 2: PROGRESSO ATOMIC SWAP */}
              {(swapStep === 'signing' ||
                swapStep === 'broadcasting' ||
                swapStep === 'proof_of_holding') && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-3 border-[#9b5094] border-t-transparent animate-spin" />
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Transazione Atomica in Corso
                    </h3>
                    <p className="text-xs text-[#cdf7f6] mt-1 max-w-xs">
                      {swapMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* FASE 3: SUCCESSO E RILASCIO CHIAVE */}
              {swapStep === 'completed' && swapResult && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-[#10b981]/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-[#10b981] font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Token UDA RGB25 assegnato al tuo Single-Use-Seal UTXO
                    </div>

                    <div className="bg-[#13141f] p-3.5 rounded-xl border border-[#9a94bc]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-[#9a94bc] font-medium">
                          Modalità di Licenza
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-bold uppercase tracking-wider">
                          Nativa RGB · Senza Codici
                        </span>
                      </div>
                      <p className="text-xs text-white leading-relaxed">
                        Nessun codice seriale o chiave di testo: la licenza è
                        legata crittograficamente al tuo wallet. Il software si
                        attiva automaticamente interrogando questo portafoglio
                        locale.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-[#9a94bc] font-mono">
                      <div>
                        Contract:{' '}
                        {swapResult.certificate.contractId.slice(0, 16)}...
                      </div>
                      <div>Seal: {swapResult.certificate.sealUtxo}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium
                    bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))]
                    border border-[rgb(var(--app-border-primary))]/30
                    hover:text-[rgb(var(--app-content-primary))] transition-all"
                      onClick={() => {
                        setShowPurchaseModal(false)
                        setSwapStep('quote')
                      }}
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
                        navigate('/my-licenses')
                      }}
                    >
                      Confirm Purchase (Demo)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auth Required Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[rgb(var(--app-surface-secondary))] rounded-2xl p-6 max-w-md w-full mx-4 border border-[rgb(var(--app-border-primary))]/30 shadow-2xl space-y-4 animate-scaleIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#9B5094]/20 border border-[#9B5094]/30 flex items-center justify-center text-[#9B5094] dark:text-[#CDF7F6]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-content-primary">
                    Accesso Richiesto
                  </h2>
                  <p className="text-xs text-content-secondary">
                    Per procedere all'acquisto della licenza è necessario
                    accedere al proprio Account LicEX.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-border-subtle text-xs text-content-secondary space-y-1.5">
                <p>
                  • Le licenze software acquistate vengono registrate e
                  assegnate direttamente al tuo <strong>nodo e account</strong>.
                </p>
                <p>
                  • Configura un'email per ricevere le credenziali o collega il
                  tuo nodo Bitcoin/RGB per il saldo.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                    setShowAuthModal(false)
                    navigate(ACCOUNT_PATH)
                  }}
                  type="button"
                >
                  <User className="w-4 h-4" />
                  Vai a Gestione Account (Email / Nodo)
                </button>

                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-surface-overlay text-content-secondary hover:text-content-primary hover:bg-surface-elevated border border-border-subtle transition-all"
                  onClick={() => {
                    setShowAuthModal(false)
                    navigate(WALLET_SETUP_PATH)
                  }}
                  type="button"
                >
                  Collega o Configura Nodo
                </button>

                <button
                  className="w-full py-1.5 text-xs text-content-tertiary hover:text-content-secondary transition-colors"
                  onClick={() => setShowAuthModal(false)}
                  type="button"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Success Toast / Modal */}
        {purchaseSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[rgb(var(--app-surface-secondary))] rounded-2xl p-6 max-w-sm w-full mx-4 border border-[rgb(var(--app-border-primary))]/30 shadow-2xl space-y-4 animate-scaleIn text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-content-primary">
                Acquisto Completato!
              </h3>
              <p className="text-xs text-content-secondary">
                La licenza per <strong>{listing.productName}</strong> è stata
                associata al tuo account LicEX.
              </p>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                onClick={() => setPurchaseSuccess(false)}
                type="button"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

Component.displayName = 'LicexLicenseDetailPage'
