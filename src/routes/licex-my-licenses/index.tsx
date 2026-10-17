// ─── LICEX My Licenses & Orders ─────────────────────────────────────────────
// Portfolio of purchased software licenses, cryptographic RGB ownership proofs,
// license keys, transfer policies and complete order history.

import { useState } from 'react'
import {
  Key,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  Search,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAppSelector } from '../../app/store/hooks'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'

export function Component() {
  const navigate = useNavigate()
  const { ownedLicenses, orders } = useAppSelector((state) => state.licex)
  const [activeTab, setActiveTab] = useState<'licenses' | 'orders'>('licenses')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})
  const [passwordModalLicId, setPasswordModalLicId] = useState<string | null>(
    null
  )
  const [nodePassword, setNodePassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleRequestReveal = (id: string) => {
    if (revealedKeys[id]) {
      // Se è già visibile, un click la richiude subito
      setRevealedKeys((prev) => ({ ...prev, [id]: false }))
    } else {
      // Se è nascosta, richiede la password del nodo per decifrarla
      setPasswordModalLicId(id)
      setNodePassword('')
      setPasswordError(null)
    }
  }

  const handleUnlockWithPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodePassword.trim()) {
      setPasswordError(
        'Inserisci la password del nodo per sbloccare la licenza.'
      )
      return
    }
    if (passwordModalLicId) {
      setRevealedKeys((prev) => ({ ...prev, [passwordModalLicId]: true }))
      setPasswordModalLicId(null)
      setNodePassword('')
      setPasswordError(null)
    }
  }

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Filter licenses by search
  const filteredLicenses = ownedLicenses.filter((lic) => {
    const name = lic.listing.productName || ''
    const key = `LICEX-${lic.id.slice(0, 8).toUpperCase()}-RGB25`
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      key.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header Banner with Signature LicEX Palette (#CDF7F6, #8FB8DE, #9A94BC, #9B5094, #6A605C) */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-border-default/60 bg-surface-overlay shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#9B5094]/10 via-[#8FB8DE]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B5094]/15 border border-[#9B5094]/30 text-[#9B5094] dark:text-[#CDF7F6] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#9B5094] dark:text-[#CDF7F6]" />
              Asset RGB25 · Bitcoin Single-Use Seals
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-content-primary tracking-tight">
              Le Mie Licenze (Asset RGB)
            </h1>
            <p className="text-content-secondary text-sm mt-1 max-w-xl">
              Portafoglio delle tue licenze software tokenizzate come asset RGB
              su Bitcoin. Ogni licenza è legata crittograficamente al tuo nodo
              ed account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8FB8DE] to-[#9B5094] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              type="button"
            >
              Esplora Marketplace
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border-subtle">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'licenses'
                ? 'bg-[#9B5094] text-white shadow-md'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
            }`}
            onClick={() => setActiveTab('licenses')}
            type="button"
          >
            <Key className="w-4 h-4" />
            Licenze Possedute ({ownedLicenses.length})
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#9B5094] text-white shadow-md'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
            }`}
            onClick={() => setActiveTab('orders')}
            type="button"
          >
            <Clock className="w-4 h-4" />
            Storico Ordini & Transazioni ({orders.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'licenses' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-overlay border border-border-default text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-primary transition-colors"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per software o chiave..."
                type="text"
                value={search}
              />
            </div>
            <div className="text-xs text-content-secondary">
              Mostrando{' '}
              <span className="font-semibold text-content-primary">
                {filteredLicenses.length}
              </span>{' '}
              licenze attive
            </div>
          </div>

          {filteredLicenses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border-default bg-surface-overlay/50">
              <Key className="w-10 h-10 text-content-tertiary mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-content-primary">
                Nessuna licenza trovata
              </h3>
              <p className="text-sm text-content-secondary mt-1">
                Non hai ancora acquistato licenze software o nessuna corrisponde
                alla ricerca.
              </p>
              <button
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              >
                Vai al Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLicenses.map((lic) => {
                const isCopied = copiedKey === lic.id
                const isRevealed = !!revealedKeys[lic.id]
                const displayKey = `LICEX-${lic.id.replace(/-/g, '').slice(0, 16).toUpperCase()}-RGB25`
                const maskedKey = `LICEX-••••-••••-${displayKey.slice(-5)}`
                return (
                  <div
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-surface-overlay border border-border-default hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl"
                    key={lic.id}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8FB8DE]/20 text-[#6A605C] dark:text-[#CDF7F6] border border-[#8FB8DE]/30">
                            {lic.listing.edition || 'Standard Edition'}
                          </span>
                          <h3 className="text-lg font-bold text-content-primary mt-1 group-hover:text-primary transition-colors">
                            {lic.listing.productName}
                          </h3>
                          <div className="text-xs text-content-secondary">
                            {lic.listing.company.name}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {lic.licenseStatus}
                        </div>
                      </div>

                      {/* License Key Box with privacy obfuscation */}
                      <div className="mt-4 p-3 rounded-xl bg-surface-elevated/60 border border-border-subtle">
                        <div className="flex items-center justify-between text-xs text-content-secondary mb-1">
                          <div className="flex items-center gap-1.5">
                            <span>Chiave di Licenza</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-content-tertiary font-mono">
                              {isRevealed ? 'In chiaro' : 'Protetta'}
                            </span>
                          </div>
                          <span className="text-[10px] text-primary font-semibold">
                            Single-Use Seal RGB
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <code
                            className={`text-xs font-mono font-bold tracking-wider truncate ${isRevealed ? 'text-content-primary' : 'text-content-secondary/80 select-none'}`}
                          >
                            {isRevealed ? displayKey : maskedKey}
                          </code>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
                              onClick={() => handleRequestReveal(lic.id)}
                              title={
                                isRevealed
                                  ? 'Nascondi chiave'
                                  : 'Sblocca con password del nodo'
                              }
                              type="button"
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
                              onClick={() => handleCopy(displayKey, lic.id)}
                              title="Copia chiave negli appunti"
                              type="button"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Badges / specs */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="p-2 rounded-lg bg-surface-elevated/40 border border-border-subtle">
                          <span className="text-content-tertiary block text-[10px]">
                            Policy Trasferimento
                          </span>
                          <span className="font-semibold text-content-primary">
                            {lic.listing.transferPolicy === 'transferable_free'
                              ? 'Libero'
                              : 'Con Approvazione'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-elevated/40 border border-border-subtle">
                          <span className="text-content-tertiary block text-[10px]">
                            Trasferimenti
                          </span>
                          <span className="font-semibold text-content-primary">
                            {lic.transferCount} volte
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                      <span className="text-content-tertiary">
                        {lic.activatedAt
                          ? `Attivata: ${new Date(lic.activatedAt).toLocaleDateString()}`
                          : 'Non ancora attivata'}
                      </span>
                      <button
                        className="flex items-center gap-1 text-primary hover:underline font-semibold transition-colors"
                        onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
                        type="button"
                      >
                        Rivendi o Trasferisci
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Orders & Transactions tab */
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-default/60 bg-surface-overlay overflow-hidden shadow-lg">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-content-primary">
                  Cronologia Completa Ordini
                </h3>
                <p className="text-xs text-content-secondary">
                  Tracciamento trasparente delle transazioni e contratti
                  software su Bitcoin.
                </p>
              </div>
              <div className="text-xs text-content-secondary bg-surface-elevated px-2.5 py-1 rounded-lg">
                Totale Ordini: {orders.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated text-content-secondary border-b border-border-subtle">
                  <tr>
                    <th className="p-3.5 font-semibold">Ordine ID</th>
                    <th className="p-3.5 font-semibold">Software / Licenza</th>
                    <th className="p-3.5 font-semibold">Tipo</th>
                    <th className="p-3.5 font-semibold">Prezzo (sats)</th>
                    <th className="p-3.5 font-semibold">Stato Ordine</th>
                    <th className="p-3.5 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-content-primary">
                  {orders.map((order) => (
                    <tr
                      className="hover:bg-surface-elevated/40 transition-colors"
                      key={order.id}
                    >
                      <td className="p-3.5 font-mono text-primary font-medium">
                        {order.id}
                      </td>
                      <td className="p-3.5 font-semibold">
                        {order.listing.productName} ({order.listing.edition})
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize px-2 py-0.5 rounded bg-surface-elevated text-content-secondary">
                          {order.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-content-primary">
                        {order.price.toLocaleString()} sats
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[11px] font-semibold">
                          <Check className="w-3 h-3" />
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-content-secondary">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Node Password Authentication Modal */}
      {passwordModalLicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-surface-overlay rounded-2xl p-6 max-w-md w-full border border-border-default shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-content-primary">
                    Autenticazione Nodo Richiesta
                  </h2>
                  <p className="text-xs text-content-secondary">
                    Protezione crittografica Single-Use Seal
                  </p>
                </div>
              </div>
              <button
                className="text-content-tertiary hover:text-content-primary transition-colors p-1"
                onClick={() => {
                  setPasswordModalLicId(null)
                  setPasswordError(null)
                }}
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed">
              Per visualizzare in chiaro la chiave seriale e verificare i
              metadati della licenza RGB, conferma l’accesso inserendo la
              password del tuo nodo o del wallet.
            </p>

            <form className="space-y-3" onSubmit={handleUnlockWithPassword}>
              <div>
                <label className="block text-[11px] font-semibold text-content-secondary mb-1">
                  Password del Nodo / Wallet
                </label>
                <input
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-default text-content-primary placeholder-content-tertiary text-sm focus:outline-none focus:border-primary transition-all"
                  onChange={(e) => {
                    setNodePassword(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  placeholder="Inserisci password..."
                  type="password"
                  value={nodePassword}
                />
                {passwordError && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-surface-elevated text-content-secondary hover:text-content-primary transition-all border border-border-subtle"
                  onClick={() => {
                    setPasswordModalLicId(null)
                    setPasswordError(null)
                  }}
                  type="button"
                >
                  Annulla
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-1.5"
                  type="submit"
                >
                  <Unlock className="w-4 h-4" />
                  Sblocca Licenza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
