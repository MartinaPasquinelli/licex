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
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-[#9A94BC]/25 bg-gradient-to-br from-[#1E1B24] via-[#241F2C] to-[#17141D] shadow-xl shadow-black/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#9B5094]/15 via-[#8FB8DE]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B5094]/20 border border-[#9B5094]/40 text-[#CDF7F6] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#CDF7F6]" />
              Cryptographic RGB Ownership
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Le Mie Licenze & Storico Ordini
            </h1>
            <p className="text-[#9A94BC] text-sm mt-1 max-w-xl">
              Gestisci le tue licenze software tokenizzate su Bitcoin,
              visualizza le chiavi crittografiche hardware-bound e consulta la
              cronologia completa degli acquisti.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8FB8DE] to-[#9B5094] hover:opacity-95 text-[#141219] font-bold text-sm shadow-lg shadow-[#9B5094]/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              type="button"
            >
              Esplora Marketplace
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-[#6A605C]/30">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'licenses'
                ? 'bg-[#8FB8DE] text-[#141219] shadow-md'
                : 'text-[#9A94BC] hover:text-white hover:bg-white/5'
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
                ? 'bg-[#8FB8DE] text-[#141219] shadow-md'
                : 'text-[#9A94BC] hover:text-white hover:bg-white/5'
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A94BC]" />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1E1B24] border border-[#6A605C]/40 text-sm text-white placeholder-[#9A94BC]/60 focus:outline-none focus:border-[#8FB8DE]"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per software o chiave..."
                type="text"
                value={search}
              />
            </div>
            <div className="text-xs text-[#9A94BC]">
              Mostrando{' '}
              <span className="font-semibold text-white">
                {filteredLicenses.length}
              </span>{' '}
              licenze attive
            </div>
          </div>

          {filteredLicenses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#6A605C]/40 bg-[#1E1B24]/50">
              <Key className="w-10 h-10 text-[#9A94BC] mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white">
                Nessuna licenza trovata
              </h3>
              <p className="text-sm text-[#9A94BC] mt-1">
                Non hai ancora acquistato licenze software o nessuna corrisponde
                alla ricerca.
              </p>
              <button
                className="mt-4 px-4 py-2 rounded-xl bg-[#8FB8DE] text-[#141219] font-bold text-sm"
                onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              >
                Vai al Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLicenses.map((lic) => {
                const isCopied = copiedKey === lic.id
                const displayKey = `LICEX-${lic.id.replace(/-/g, '').slice(0, 16).toUpperCase()}-RGB25`
                return (
                  <div
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#1E1B24] border border-[#9A94BC]/20 hover:border-[#8FB8DE]/50 transition-all duration-300 shadow-lg shadow-black/20"
                    key={lic.id}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8FB8DE]/15 text-[#CDF7F6] border border-[#8FB8DE]/30">
                            {lic.listing.edition || 'Standard Edition'}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-1 group-hover:text-[#CDF7F6] transition-colors">
                            {lic.listing.productName}
                          </h3>
                          <div className="text-xs text-[#9A94BC]">
                            {lic.listing.company.name}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {lic.licenseStatus}
                        </div>
                      </div>

                      {/* License Key Box */}
                      <div className="mt-4 p-3 rounded-xl bg-[#141219] border border-[#6A605C]/40">
                        <div className="flex items-center justify-between text-xs text-[#9A94BC] mb-1">
                          <span>Chiave di Licenza</span>
                          <span className="text-[10px] text-[#CDF7F6]">
                            Single-Use Seal RGB
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs font-mono font-bold text-[#CDF7F6] truncate">
                            {displayKey}
                          </code>
                          <button
                            className="p-1.5 rounded-lg text-[#9A94BC] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                            onClick={() => handleCopy(displayKey, lic.id)}
                            title="Copia chiave"
                            type="button"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Badges / specs */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[#9A94BC] block text-[10px]">
                            Policy Trasferimento
                          </span>
                          <span className="font-semibold text-white">
                            {lic.listing.transferPolicy === 'transferable_free'
                              ? 'Libero'
                              : 'Con Approvazione'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[#9A94BC] block text-[10px]">
                            Trasferimenti
                          </span>
                          <span className="font-semibold text-white">
                            {lic.transferCount} volte
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#6A605C]/30 flex items-center justify-between text-xs">
                      <span className="text-[#9A94BC]">
                        {lic.activatedAt
                          ? `Attivata: ${new Date(lic.activatedAt).toLocaleDateString()}`
                          : 'Non ancora attivata'}
                      </span>
                      <button
                        className="flex items-center gap-1 text-[#8FB8DE] hover:text-[#CDF7F6] font-semibold transition-colors"
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
          <div className="rounded-2xl border border-[#9A94BC]/20 bg-[#1E1B24] overflow-hidden shadow-xl shadow-black/20">
            <div className="p-4 border-b border-[#6A605C]/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Cronologia Completa Ordini
                </h3>
                <p className="text-xs text-[#9A94BC]">
                  Tracciamento trasparente delle transazioni e contratti
                  software su Bitcoin.
                </p>
              </div>
              <div className="text-xs text-[#9A94BC] bg-white/5 px-2.5 py-1 rounded-lg">
                Totale Ordini: {orders.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141219] text-[#9A94BC] border-b border-[#6A605C]/30">
                  <tr>
                    <th className="p-3.5 font-semibold">Ordine ID</th>
                    <th className="p-3.5 font-semibold">Software / Licenza</th>
                    <th className="p-3.5 font-semibold">Tipo</th>
                    <th className="p-3.5 font-semibold">Prezzo (sats)</th>
                    <th className="p-3.5 font-semibold">Stato Ordine</th>
                    <th className="p-3.5 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6A605C]/20 text-white">
                  {orders.map((order) => (
                    <tr
                      className="hover:bg-white/[0.02] transition-colors"
                      key={order.id}
                    >
                      <td className="p-3.5 font-mono text-[#CDF7F6]">
                        {order.id}
                      </td>
                      <td className="p-3.5 font-semibold">
                        {order.listing.productName} ({order.listing.edition})
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize px-2 py-0.5 rounded bg-white/5 text-[#9A94BC]">
                          {order.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-[#8FB8DE]">
                        {order.price.toLocaleString()} sats
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                          <Check className="w-3 h-3" />
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#9A94BC]">
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
