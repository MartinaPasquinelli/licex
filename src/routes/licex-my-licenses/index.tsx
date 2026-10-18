// ─── LICEX My Licenses & Orders ─────────────────────────────────────────────
// Portfolio of purchased software licenses, cryptographic RGB ownership proofs,
// license keys, transfer policies and complete order history.

import { useState, useEffect } from 'react'
import {
  Key,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  Search,
  Sparkles,
  Zap,
  Database,
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  resetDatabase,
  setOwnedLicenses,
  setOrders,
} from '../../slices/licex/licex.slice'
import {
  loadLicensesFromSqlite,
  loadOrdersFromSqlite,
} from '../../services/licex/licexStorage'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'

export function Component() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { ownedLicenses, orders } = useAppSelector((state) => state.licex)
  const [activeTab, setActiveTab] = useState<'licenses' | 'orders'>('licenses')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [testedHandshakeId, setTestedHandshakeId] = useState<string | null>(
    null
  )

  // Interroga direttamente le tabelle SQLite native al montaggio della pagina
  useEffect(() => {
    loadLicensesFromSqlite().then((sqliteLicenses) => {
      if (sqliteLicenses && sqliteLicenses.length > 0) {
        dispatch(setOwnedLicenses(sqliteLicenses))
      }
    })
    loadOrdersFromSqlite().then((sqliteOrders) => {
      if (sqliteOrders && sqliteOrders.length > 0) {
        dispatch(setOrders(sqliteOrders))
      }
    })
  }, [dispatch])

  const handleTestHandshake = (id: string) => {
    setTestedHandshakeId(id)
    setTimeout(() => setTestedHandshakeId(null), 3500)
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
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B5094]/15 border border-[#9B5094]/30 text-[#9B5094] dark:text-[#CDF7F6] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#9B5094] dark:text-[#CDF7F6]" />
                Asset RGB25 · Bitcoin Single-Use Seals
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Database className="w-3 h-3 text-emerald-400" />
                DB Locale Persistente
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-content-primary tracking-tight">
              Le Mie Licenze (Asset RGB)
            </h1>
            <p className="text-content-secondary text-sm mt-1 max-w-xl">
              Portafoglio delle tue licenze software tokenizzate come asset RGB
              su Bitcoin. Ogni licenza è salvata persistentemente nel tuo
              database locale e legata crittograficamente al tuo nodo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border-default text-content-secondary hover:text-content-primary text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              onClick={() => {
                if (
                  window.confirm(
                    'Vuoi ripristinare il database locale alle licenze e ordini demo di fabbrica?'
                  )
                ) {
                  dispatch(resetDatabase())
                }
              }}
              title="Ripristina dati demo nel database locale"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset DB Locale
            </button>
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
                const contractId = `rgb1${lic.id.replace(/-/g, '').slice(0, 10)}...licex`
                const sealUtxo = `txid:${lic.id.replace(/-/g, '').slice(0, 8)}...:1`
                const isCopied = copiedKey === lic.id
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

                      {/* Codeless RGB25 Asset & Software Handshake Card */}
                      <div className="mt-4 p-3.5 rounded-xl bg-surface-elevated/70 border border-border-subtle space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-content-primary flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Asset RGB25 (Codeless)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            Wallet Linked
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] font-mono bg-surface-overlay/80 p-2.5 rounded-lg border border-border-subtle">
                          <div className="flex justify-between items-center text-content-secondary">
                            <span>Contract ID:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-content-primary font-bold">
                                {contractId}
                              </span>
                              <button
                                className="p-1 hover:text-primary transition-colors"
                                onClick={() => handleCopy(contractId, lic.id)}
                                title="Copia Contract ID"
                                type="button"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-content-tertiary" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-content-secondary">
                            <span>Single-Use Seal:</span>
                            <span className="text-primary font-bold">
                              {sealUtxo}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle/40">
                          <div className="text-[11px]">
                            {testedHandshakeId === lic.id ? (
                              <span className="text-emerald-500 font-semibold flex items-center gap-1 animate-fadeIn">
                                <Check className="w-3.5 h-3.5" />
                                Handshake Software OK! Licenza Attiva
                              </span>
                            ) : (
                              <span className="text-content-secondary">
                                Attivazione automatica via wallet
                              </span>
                            )}
                          </div>
                          <button
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1"
                            onClick={() => handleTestHandshake(lic.id)}
                            title="Simula l'interrogazione del software locale al wallet per verificare il possesso dell'asset"
                            type="button"
                          >
                            <Zap className="w-3 h-3" />
                            Test Connessione
                          </button>
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
    </div>
  )
}
