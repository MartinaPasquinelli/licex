import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Bell,
  BellOff,
  Trash2,
  Eye,
  Shield,
  TrendingDown,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  removeFromWatchlist,
  removePriceAlert,
  setWatchlist,
  setPriceAlerts,
} from '../../slices/licex/licex.slice'
import {
  loadWatchlistFromSqlite,
  loadPriceAlertsFromSqlite,
} from '../../services/licex/licexStorage'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'

function formatSats(sats: number): string {
  if (sats === 0) return 'Free'
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K sats`
  return `${sats.toLocaleString()} sats`
}

export function Component() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { watchlist, priceAlerts } = useAppSelector((s) => s.licex)

  useEffect(() => {
    loadWatchlistFromSqlite().then((items) => {
      if (items && items.length > 0) dispatch(setWatchlist(items))
    })
    loadPriceAlertsFromSqlite().then((alerts) => {
      if (alerts && alerts.length > 0) dispatch(setPriceAlerts(alerts))
    })
  }, [dispatch])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
            <Heart className="w-7 h-7 inline-block mr-2 text-rose-400 -mt-1" />
            Watchlist
          </h1>
          <p className="text-sm text-[rgb(var(--app-content-secondary))] mt-1">
            Your saved licenses and price alerts
          </p>
        </div>

        {/* Saved Licenses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[rgb(var(--app-content-primary))]">
              Saved Licenses
            </h2>
            <span className="text-xs text-[rgb(var(--app-content-secondary))] bg-[rgb(var(--app-surface-secondary))] px-3 py-1 rounded-full">
              {watchlist.length} item{watchlist.length !== 1 ? 's' : ''}
            </span>
          </div>

          {watchlist.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center
              rounded-2xl bg-[rgb(var(--app-surface-secondary))]/30
              border border-[rgb(var(--app-border-primary))]/20 border-dashed"
            >
              <Heart className="w-12 h-12 text-[rgb(var(--app-content-secondary))]/20 mb-4" />
              <p className="text-sm text-[rgb(var(--app-content-secondary))]">
                No saved licenses yet
              </p>
              <button
                className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              >
                Browse the Marketplace →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div
                  className="flex items-center gap-4 p-4 rounded-xl
                    bg-[rgb(var(--app-surface-secondary))]/50
                    border border-[rgb(var(--app-border-primary))]/20
                    hover:border-purple-500/30 transition-all group cursor-pointer"
                  key={item.id}
                  onClick={() =>
                    navigate(`${LICEX_MARKETPLACE_PATH}/${item.listingId}`)
                  }
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                    bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20"
                  >
                    {item.listing.category === 'Creative & Design'
                      ? '🎨'
                      : item.listing.category === 'Security'
                        ? '🛡️'
                        : item.listing.category === 'Development'
                          ? '⚙️'
                          : item.listing.category === 'Analytics & AI'
                            ? '🧠'
                            : item.listing.category === 'Gaming'
                              ? '🎮'
                              : '📦'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[rgb(var(--app-content-primary))] truncate group-hover:text-purple-300 transition-colors">
                        {item.listing.productName}
                      </h3>
                      {item.listing.company.companyStatus === 'verified' && (
                        <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                        {item.listing.company.name}
                      </span>
                      <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                        ·
                      </span>
                      <span className="text-xs text-[rgb(var(--app-content-secondary))]">
                        {item.listing.edition}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-[rgb(var(--app-content-primary))]">
                      {formatSats(item.listing.price)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      className="p-2 rounded-lg text-[rgb(var(--app-content-secondary))] hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`${LICEX_MARKETPLACE_PATH}/${item.listingId}`)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg text-[rgb(var(--app-content-secondary))] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch(removeFromWatchlist(item.listingId))
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[rgb(var(--app-content-primary))]">
              <Bell className="w-5 h-5 inline-block mr-1.5 -mt-0.5 text-cyan-400" />
              Price Alerts
            </h2>
            <span className="text-xs text-[rgb(var(--app-content-secondary))] bg-[rgb(var(--app-surface-secondary))] px-3 py-1 rounded-full">
              {priceAlerts.length} alert{priceAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {priceAlerts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center
              rounded-2xl bg-[rgb(var(--app-surface-secondary))]/30
              border border-[rgb(var(--app-border-primary))]/20 border-dashed"
            >
              <BellOff className="w-10 h-10 text-[rgb(var(--app-content-secondary))]/20 mb-3" />
              <p className="text-sm text-[rgb(var(--app-content-secondary))]">
                No price alerts set
              </p>
              <p className="text-xs text-[rgb(var(--app-content-secondary))]/60 mt-1">
                Set alerts from the license detail page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {priceAlerts.map((alert) => (
                <div
                  className={`flex items-center gap-4 p-4 rounded-xl
                    border transition-all
                    ${
                      alert.triggered
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-[rgb(var(--app-surface-secondary))]/50 border-[rgb(var(--app-border-primary))]/20'
                    }`}
                  key={alert.id}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      alert.triggered ? 'bg-green-500/10' : 'bg-cyan-500/10'
                    }`}
                  >
                    {alert.triggered ? (
                      <TrendingDown className="w-5 h-5 text-green-400" />
                    ) : (
                      <Bell className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[rgb(var(--app-content-primary))] truncate">
                      {alert.listing.productName}
                    </h3>
                    <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-0.5">
                      Alert when price ≤ {formatSats(alert.thresholdSats)}
                      {alert.triggered && (
                        <span className="ml-2 text-green-400 font-medium">
                          ✓ Triggered
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[rgb(var(--app-content-primary))]">
                      Current: {formatSats(alert.listing.price)}
                    </p>
                  </div>

                  <button
                    className="p-2 rounded-lg text-[rgb(var(--app-content-secondary))] hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-shrink-0"
                    onClick={() => dispatch(removePriceAlert(alert.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

Component.displayName = 'LicexWatchlistPage'
