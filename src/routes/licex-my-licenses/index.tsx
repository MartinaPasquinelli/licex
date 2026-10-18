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
  FileText,
  X,
  Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

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
import { MOCK_EULA_ANALYSIS } from '../../constants/licex-mock-data'
import { mintLicenseListing } from '../../slices/licex/licex.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import {
  createIssuanceInputFromEula,
  issueLicenseRgbAsset,
} from '../../services/licex/licenseAssetIssuer'
import type { IssuedLicenseAsset } from '../../services/licex/licenseAssetIssuer'
import type { LicenseListing } from '../../types/licex'

const formatContractDetails = (details?: string): string => {
  if (!details) return 'Il nodo non ha restituito i dettagli del contratto.'
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

const getIssuanceErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    const data = value.data
    if (data && typeof data === 'object') {
      const details = data as Record<string, unknown>
      for (const key of ['error', 'message', 'detail']) {
        if (typeof details[key] === 'string' && details[key]) {
          return details[key] as string
        }
      }
    }
    for (const key of ['error', 'message', 'detail']) {
      if (typeof value[key] === 'string' && value[key]) {
        return value[key] as string
      }
    }
    if (typeof value.status === 'number') {
      return `Il nodo RGB ha rifiutato la richiesta (errore ${value.status}).`
    }
  }
  return 'Errore sconosciuto durante la comunicazione con il nodo RGB.'
}

const isMissingUncoloredUtxo = (error: unknown): boolean =>
  getIssuanceErrorMessage(error).toLowerCase().includes('no uncolored utxos')

export function Component() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { ownedLicenses, orders, listings } = useAppSelector(
    (state) => state.licex
  )
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
  const [contractListing, setContractListing] = useState<LicenseListing | null>(
    null
  )
  const [isCreatingUda, setIsCreatingUda] = useState(false)
  const [issueUda] = nodeApi.endpoints.issueUdaAsset.useMutation()
  const [createUtxos] = nodeApi.endpoints.createUtxos.useMutation()
  const [signMessage] = nodeApi.endpoints.signMessage.useMutation()
  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()
  const [getNodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()
  const publishedLicenseListings = listings.filter(
    (listing) =>
      listing.status === 'published' &&
      listing.rgbAsset?.schema === 'UDA' &&
      listing.rgbAsset.mode === 'rgb-node'
  )

  const handleCreateDemoUda = async () => {
    if (isCreatingUda) return
    setIsCreatingUda(true)
    try {
      const network = await getNetworkInfo().unwrap()
      if (network.network === 'Mainnet') {
        throw new Error(
          'Emissione demo bloccata su Mainnet. Collega il nodo a Signet o Regtest.'
        )
      }
      const issuer = await getNodeInfo().unwrap()
      const requestId = crypto.randomUUID()
      const issuanceInput = createIssuanceInputFromEula(
        MOCK_EULA_ANALYSIS,
        requestId
      )
      const issue = () =>
        issueLicenseRgbAsset(
          issuanceInput,
          (request) => issueUda(request).unwrap(),
          async (message) =>
            (await signMessage({ message }).unwrap()).signed_message,
          issuer.pubkey
        )
      let issuedAsset: IssuedLicenseAsset
      try {
        issuedAsset = await issue()
      } catch (error) {
        if (!isMissingUncoloredUtxo(error)) throw error
        toast.info('Preparo un UTXO Bitcoin per l’emissione UDA…')
        await createUtxos({
          fee_rate: 2,
          num: 1,
          size: 32500,
          up_to: false,
        }).unwrap()
        issuedAsset = await issue()
      }

      dispatch(
        mintLicenseListing({
          company: {
            companyStatus: 'pending',
            domain: MOCK_EULA_ANALYSIS.suggestedListing.publisherDomain,
            name: MOCK_EULA_ANALYSIS.suggestedListing.publisherName,
          },
          edition: issuanceInput.edition,
          id: `lic-${requestId}`,
          listingDetails: {
            category: 'Creative & Design',
            durationDays: MOCK_EULA_ANALYSIS.suggestedListing.durationDays,
            licenseType: MOCK_EULA_ANALYSIS.suggestedListing.licenseType,
            platforms: [...MOCK_EULA_ANALYSIS.suggestedListing.platforms],
            productDescription:
              MOCK_EULA_ANALYSIS.suggestedListing.productDescription,
            tags: [...MOCK_EULA_ANALYSIS.suggestedListing.tags],
            version: MOCK_EULA_ANALYSIS.suggestedListing.version,
          },
          price: MOCK_EULA_ANALYSIS.suggestedListing.priceSats,
          productName: issuanceInput.productName,
          rgbAsset: issuedAsset,
          royaltyPercent: issuanceInput.royaltyPercent,
          transferPolicy: issuanceInput.transferPolicy,
        })
      )
      toast.success(`UDA demo creata e pubblicata su ${network.network}.`)
    } catch (error) {
      const message = getIssuanceErrorMessage(error)
      toast.error(message)
    } finally {
      setIsCreatingUda(false)
    }
  }

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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#9B5094]/40 bg-[#9B5094]/10 hover:bg-[#9B5094]/20 text-[#9B5094] dark:text-[#CDF7F6] font-bold text-sm transition-all"
              disabled={isCreatingUda}
              onClick={handleCreateDemoUda}
              type="button"
            >
              <Plus className="w-4 h-4" />
              {isCreatingUda ? 'Creazione UDA…' : 'Crea UDA demo'}
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
          {publishedLicenseListings.length > 0 && (
            <section className="rounded-2xl border border-[#9B5094]/25 bg-gradient-to-br from-[#9B5094]/10 via-surface-overlay to-surface-overlay p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-content-primary">
                    Licenze emesse da te
                  </h2>
                  <p className="text-xs text-content-secondary mt-0.5">
                    Le UDA pubblicate nel Marketplace e i relativi contratti.
                  </p>
                </div>
                <span className="text-xs text-content-secondary">
                  {publishedLicenseListings.length} in vendita
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {publishedLicenseListings.map((listing) => (
                  <article
                    className="rounded-xl border border-border-subtle bg-surface-overlay/80 p-4 space-y-3"
                    key={listing.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-content-primary truncate">
                          {listing.productName}
                        </h3>
                        <p className="text-xs text-content-secondary">
                          {listing.edition} · v{listing.version}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        In vendita
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-content-secondary">Prezzo</span>
                      <span className="font-bold text-content-primary">
                        {listing.price.toLocaleString()} sats
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-content-tertiary truncate">
                      UDA: {listing.rgbAsset?.contractId}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        className="flex-1 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                        onClick={() => setContractListing(listing)}
                        type="button"
                      >
                        <FileText className="inline w-3.5 h-3.5 mr-1.5" />
                        Vedi contratto
                      </button>
                      <button
                        className="rounded-lg bg-surface-elevated px-3 py-2 text-xs font-semibold text-content-primary hover:bg-surface-elevated/70"
                        onClick={() =>
                          navigate(`${LICEX_MARKETPLACE_PATH}/${listing.id}`)
                        }
                        type="button"
                      >
                        Marketplace
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

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
      {contractListing?.rgbAsset && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setContractListing(null)}
          role="dialog"
        >
          <section
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-overlay shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-overlay p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Contratto RGB UDA
                </p>
                <h2 className="mt-1 text-lg font-bold text-content-primary">
                  {contractListing.productName} · {contractListing.edition}
                </h2>
              </div>
              <button
                aria-label="Chiudi contratto"
                className="rounded-lg p-2 text-content-secondary hover:bg-surface-elevated hover:text-content-primary"
                onClick={() => setContractListing(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-surface-elevated p-3">
                  <dt className="text-[11px] text-content-tertiary">
                    Contract / Asset ID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-content-primary">
                    {contractListing.rgbAsset.contractId}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3">
                  <dt className="text-[11px] text-content-tertiary">
                    Schema e stato
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-content-primary">
                    {contractListing.rgbAsset.schema} · In vendita
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3 sm:col-span-2">
                  <dt className="text-[11px] text-content-tertiary">
                    SHA-256 dei termini EULA
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-content-primary">
                    {contractListing.rgbAsset.metadataHash}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3 sm:col-span-2">
                  <dt className="text-[11px] text-content-tertiary">
                    Chiave pubblica issuer
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-content-primary">
                    {contractListing.rgbAsset.issuerPubkey ?? 'Non disponibile'}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3 sm:col-span-2">
                  <dt className="text-[11px] text-content-tertiary">
                    Firma issuer
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-content-primary">
                    {contractListing.rgbAsset.issuerSignature ??
                      'Non disponibile'}
                  </dd>
                </div>
              </dl>
              <div>
                <h3 className="mb-2 text-sm font-bold text-content-primary">
                  Metadati inclusi nel contratto
                </h3>
                <pre className="max-h-80 overflow-auto rounded-xl border border-border-subtle bg-surface-elevated p-4 text-[11px] leading-relaxed text-content-secondary whitespace-pre-wrap break-words">
                  {formatContractDetails(
                    contractListing.rgbAsset.contractDetails
                  )}
                </pre>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
