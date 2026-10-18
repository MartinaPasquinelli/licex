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
  Tag,
  FileText,
  X,
  FileSearch,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import {
  completePurchase,
  addP2pOffer,
  resetDatabase,
  setOwnedLicenses,
  setOrders,
} from '../../slices/licex/licex.slice'
import type { LicenseListing, LicenseRecord, Order } from '../../types/licex'
import { MOCK_LISTINGS } from '../../constants/licex-mock-data'
import {
  loadLicensesFromSqlite,
  loadOrdersFromSqlite,
  saveLocalOwnedLicenses,
} from '../../services/licex/licexStorage'
import { issueDemoLicenseAsset } from '../../services/licex/licenseAssetIssuer'
import { logger } from '../../utils/logger'
import { removeDemoRgbAsset, saveDemoRgbAsset } from '../../utils/demoAssets'
import {
  adjustP2PSimulationUsdtBalance,
  createP2PSimulationSwapString,
  enableP2PSimulation,
  getP2PSimulationAssetBalance,
  getP2PSimulationNodePubkey,
  getP2PSimulationUsdtBalance,
  isP2PSimulationAvailable,
  isP2PSimulationEnabled,
  resetP2PSimulationWallet,
  setP2PSimulationAssetBalance,
} from '../../services/licexP2PSimulation'
import { LICEX_MARKETPLACE_PATH } from '../../app/router/paths'
import type { NostrLicenseOffer } from '../../types/licexNostr'
import {
  deleteP2PSwapSecret,
  fetchMarketplaceSnapshot,
  getP2PSwapSecret,
  getMarketplaceIdentity,
  publishMarketplacePurchaseResult,
  publishMarketplaceResaleOffer,
  saveP2PSwapSecret,
  type NostrMarketplacePurchaseRequest,
} from '../../services/licexNostrMarketplace'

interface IncomingP2PPurchase {
  request: NostrMarketplacePurchaseRequest
  offer: NostrLicenseOffer
}
import { EulaAnalyzerTab } from '../licex-assistant/EulaAnalyzerTab'

const formatContractDetails = (details?: string): string => {
  if (!details) return 'Il nodo non ha restituito i dettagli del contratto.'
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

export function Component() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { ownedLicenses, orders, p2pOffers, listings } = useAppSelector(
    (state) => state.licex
  )
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(
    isP2PSimulationEnabled()
  )
  const [testWalletBalance, setTestWalletBalance] = useState(
    getP2PSimulationUsdtBalance()
  )
  const [testWalletMessage, setTestWalletMessage] = useState<string | null>(
    null
  )
  const [, setTestAssetBalanceRevision] = useState(0)
  const { data: nodeAssets, refetch: refetchNodeAssets } =
    nodeApi.useListAssetsQuery(undefined, {
      skip: isTestModeEnabled,
    })
  const { data: nodeInfo } = nodeApi.endpoints.nodeInfo.useQuery(undefined, {
    skip: isTestModeEnabled,
  })
  const [makerInit] = nodeApi.useMakerInitMutation()
  const [makerExecute] = nodeApi.useMakerExecuteMutation()
  const [refreshRgbTransfers] = nodeApi.endpoints.refresh.useMutation()
  const [getAssetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()
  const [activeTab, setActiveTab] = useState<'licenses' | 'orders'>('licenses')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [testedHandshakeId, setTestedHandshakeId] = useState<string | null>(
    null
  )
  const [sellingLicenseId, setSellingLicenseId] = useState<string | null>(null)
  const [resalePrice, setResalePrice] = useState('')
  const [isPublishingOffer, setIsPublishingOffer] = useState(false)
  const [sellMessage, setSellMessage] = useState<string | null>(null)
  const [incomingPurchases, setIncomingPurchases] = useState<
    IncomingP2PPurchase[]
  >([])
  const [executingPurchaseId, setExecutingPurchaseId] = useState<string | null>(
    null
  )
  const [purchaseExecutionMessage, setPurchaseExecutionMessage] = useState<
    string | null
  >(null)
  const [isSyncingP2PPurchases, setIsSyncingP2PPurchases] = useState(false)
  const [p2pSyncMessage, setP2pSyncMessage] = useState<string | null>(null)
  const [isPortfolioLoaded, setIsPortfolioLoaded] = useState(false)

  // Interroga direttamente le tabelle SQLite native al montaggio della pagina
  useEffect(() => {
    Promise.all([loadLicensesFromSqlite(), loadOrdersFromSqlite()]).then(
      ([sqliteLicenses, sqliteOrders]) => {
        if (sqliteLicenses && sqliteLicenses.length > 0) {
          dispatch(setOwnedLicenses(sqliteLicenses))
        }
        if (sqliteOrders && sqliteOrders.length > 0) {
          dispatch(setOrders(sqliteOrders))
        }
        setIsPortfolioLoaded(true)
      }
    )
  }, [dispatch])

  useEffect(() => {
    let isCurrent = true
    const loadIncomingPurchases = async () => {
      try {
        const [identity, snapshot] = await Promise.all([
          getMarketplaceIdentity(),
          fetchMarketplaceSnapshot(),
        ])
        if (!identity || !isCurrent) return
        const ownOffers = snapshot.offers.filter(
          (offer) => offer.sellerNpub === identity && offer.status === 'active'
        )
        const ownOfferIds = new Set(ownOffers.map((offer) => offer.id))
        const requests = snapshot.purchaseRequests
          .filter((request) => ownOfferIds.has(request.offerId))
          .flatMap((request) => {
            const offer = ownOffers.find((item) => item.id === request.offerId)
            return offer
              ? [
                  {
                    offer,
                    request,
                  },
                ]
              : []
          })
        if (isCurrent) setIncomingPurchases(requests)
      } catch (error) {
        logger.warn(
          '[LICEX Marketplace] Failed to load purchase requests:',
          error
        )
      }
    }
    void loadIncomingPurchases()
    const refreshTimer = window.setInterval(() => {
      void loadIncomingPurchases()
    }, 15_000)
    return () => {
      isCurrent = false
      window.clearInterval(refreshTimer)
    }
  }, [])
  const [contractListing, setContractListing] = useState<LicenseListing | null>(
    null
  )
  const [showEulaAnalyzer, setShowEulaAnalyzer] = useState(false)
  const publishedLicenseListings = listings.filter(
    (listing) =>
      listing.status === 'published' &&
      listing.rgbAsset?.schema === 'UDA' &&
      (listing.rgbAsset.mode === 'rgb-node' ||
        (isTestModeEnabled && listing.rgbAsset.mode === 'demo'))
  )

  const handleTestHandshake = (id: string) => {
    setTestedHandshakeId(id)
    setTimeout(() => setTestedHandshakeId(null), 3500)
  }

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const activateTestWallet = () => {
    try {
      enableP2PSimulation()
      setIsTestModeEnabled(true)
      setTestWalletBalance(getP2PSimulationUsdtBalance())
      setTestWalletMessage(
        'Portafoglio simulato attivo. Saldo iniziale: 1.000 demo-USDT.'
      )
    } catch (error) {
      setTestWalletMessage(
        error instanceof Error
          ? error.message
          : 'Attivazione test non riuscita.'
      )
    }
  }

  const createTestLicense = async () => {
    try {
      enableP2PSimulation()
      setIsTestModeEnabled(true)
      const requestId = crypto.randomUUID()
      const asset = await issueDemoLicenseAsset({
        edition: 'P2P Test',
        productName: 'LICEX License Test',
        requestId,
        royaltyPercent: 0,
        transferPolicy: 'transferable_free',
        version: 'test-1',
      })
      const template = MOCK_LISTINGS[0]
      const listing: LicenseListing = {
        ...template,
        edition: 'P2P Test',
        id: `listing-${requestId}`,
        maxTransfers: null,
        minHoldingDays: 0,
        productName: 'LICEX License Test',
        rgbAsset: asset,
        royaltyPercent: 0,
        status: 'published',
        transferPolicy: 'transferable_free',
      }
      const license: LicenseRecord = {
        activatedAt: new Date().toISOString(),
        activationStatus: 'unknown',
        id: `license-${requestId}`,
        licenseStatus: 'active',
        listing,
        orderId: `test-order-${requestId}`,
        transferCount: 0,
      }
      const updatedLicenses = [license, ...ownedLicenses]
      setP2PSimulationAssetBalance(asset.assetId, 1)
      dispatch(setOwnedLicenses(updatedLicenses))
      saveLocalOwnedLicenses(updatedLicenses)
      setTestWalletBalance(getP2PSimulationUsdtBalance())
      setTestAssetBalanceRevision((revision) => revision + 1)
      setTestWalletMessage(
        'Licenza demo aggiunta al portafoglio e pronta per la rivendita simulata.'
      )
    } catch (error) {
      setTestWalletMessage(
        error instanceof Error
          ? error.message
          : 'Creazione licenza test non riuscita.'
      )
    }
  }

  const selectedLicense = ownedLicenses.find(
    (license) => license.id === sellingLicenseId
  )
  const submitResaleOffer = async () => {
    if (!selectedLicense || isPublishingOffer) return
    const price = Number(resalePrice)
    if (!Number.isFinite(price) || price <= 0) {
      setSellMessage('Inserisci un prezzo USDT maggiore di zero.')
      return
    }
    if (selectedLicense.listing.transferPolicy !== 'transferable_free') {
      setSellMessage(
        'La licenza richiede l’approvazione dell’editore prima del trasferimento.'
      )
      return
    }
    const isSimulationLicense =
      isTestModeEnabled && selectedLicense.listing.rgbAsset?.mode === 'demo'
    if (
      !isSimulationLicense &&
      selectedLicense.listing.minHoldingDays !== null &&
      selectedLicense.activatedAt &&
      Date.now() - new Date(selectedLicense.activatedAt).getTime() <
        selectedLicense.listing.minHoldingDays * 24 * 60 * 60 * 1000
    ) {
      setSellMessage('Non è ancora trascorso il periodo minimo di possesso.')
      return
    }

    setIsPublishingOffer(true)
    setSellMessage(null)
    try {
      const licenseAssetId = selectedLicense.listing.rgbAsset?.assetId
      const isSimulationOffer =
        isTestModeEnabled && selectedLicense.listing.rgbAsset?.mode === 'demo'
      if (!licenseAssetId) {
        throw new Error('La licenza non ha un riferimento asset.')
      }

      let swapString: string
      let paymentSecret: string | null = null
      if (isSimulationOffer) {
        if (getP2PSimulationAssetBalance(licenseAssetId) < 1) {
          throw new Error(
            'Il portafoglio demo non possiede più questa licenza.'
          )
        }
        swapString = createP2PSimulationSwapString(licenseAssetId, price)
      } else {
        const licenseAsset = [
          ...(nodeAssets?.nia ?? []),
          ...(nodeAssets?.uda ?? []),
          ...(nodeAssets?.cfa ?? []),
          ...(nodeAssets?.ifa ?? []),
        ].find((asset) => asset.asset_id === licenseAssetId)
        const usdtAsset = (nodeAssets?.nia ?? []).find(
          (asset) => asset.ticker === 'USDT'
        )

        if (
          selectedLicense.listing.rgbAsset?.mode !== 'rgb-node' ||
          selectedLicense.listing.rgbAsset.status !== 'issued' ||
          !licenseAsset
        ) {
          throw new Error(
            'Questa licenza non è un asset RGB reale presente nel nodo.'
          )
        }
        if (!usdtAsset) {
          throw new Error('Il nodo non contiene un asset RGB-USDT spendibile.')
        }

        const licenseBalance = await getAssetBalance({
          asset_id: licenseAssetId,
        }).unwrap()
        if ((licenseBalance.spendable ?? 0) < 1) {
          throw new Error(
            'Il nodo non ha una unità spendibile di questa licenza.'
          )
        }

        const usdtAmount = Math.round(price * 10 ** (usdtAsset.precision ?? 0))
        if (usdtAmount <= 0) {
          throw new Error('Il prezzo è inferiore all’unità minima di RGB-USDT.')
        }
        const swap = await makerInit({
          from_asset: usdtAsset.asset_id,
          qty_from: usdtAmount,
          qty_to: 1,
          timeout_sec: 3600,
          to_asset: licenseAssetId,
        }).unwrap()
        if (!swap.swapstring || !swap.payment_secret) {
          throw new Error(
            'Il nodo non ha restituito i dati dello swap atomico.'
          )
        }
        paymentSecret = swap.payment_secret
        swapString = swap.swapstring
      }

      const offerId = `resale-${crypto.randomUUID()}`
      if (paymentSecret) await saveP2PSwapSecret(offerId, paymentSecret)
      const sellerNpub = await getMarketplaceIdentity()
      if (!sellerNpub) {
        throw new Error('La pubblicazione richiede l’app desktop LICEX.')
      }
      const offer = {
        createdAt: new Date().toISOString(),
        id: offerId,
        licenseRecordId: selectedLicense.id,
        listing: selectedLicense.listing,
        resalePriceUsdt: price,
        royaltyPercent: selectedLicense.listing.royaltyPercent,
        swapString,
        ...(isSimulationOffer ? { simulation: true } : {}),
        sellerName: `${sellerNpub.slice(0, 13)}…`,
        sellerNpub,
        status: 'active' as const,
        transferCount: selectedLicense.transferCount,
        transferPolicy: selectedLicense.listing.transferPolicy,
      }
      const nostrEventId = await publishMarketplaceResaleOffer(offer)
      if (!nostrEventId) {
        throw new Error('Il relay non ha confermato la pubblicazione.')
      }
      dispatch(addP2pOffer({ ...offer, nostrEventId }))
      setSellMessage('Offerta pubblicata sui Nostr Relay.')
    } catch (error) {
      setSellMessage(
        error instanceof Error ? error.message : 'Pubblicazione non riuscita.'
      )
    } finally {
      setIsPublishingOffer(false)
    }
  }

  const syncCompletedP2PPurchases = async () => {
    if (isSyncingP2PPurchases) return
    setIsSyncingP2PPurchases(true)
    setP2pSyncMessage(null)
    try {
      if (!isPortfolioLoaded) {
        throw new Error('Attendi il caricamento del portafoglio locale.')
      }
      if (!isTestModeEnabled && !nodeInfo?.pubkey) {
        throw new Error('Connetti e sblocca il nodo RGB prima della verifica.')
      }
      const identity = await getMarketplaceIdentity()
      if (!identity) {
        throw new Error('Sincronizzazione disponibile nell’app desktop LICEX.')
      }

      if (!isTestModeEnabled) {
        setP2pSyncMessage('Aggiorno i trasferimenti RGB in arrivo…')
        await refreshRgbTransfers(undefined).unwrap()
        await refetchNodeAssets()
      }

      const snapshot = await fetchMarketplaceSnapshot()
      const buyerResults = snapshot.purchaseResults.filter(
        (result) =>
          result.buyerNpub === identity &&
          result.buyerNodePubkey ===
            (result.simulation && isTestModeEnabled
              ? getP2PSimulationNodePubkey()
              : nodeInfo?.pubkey)
      )
      let importedCount = 0
      let waitingForAsset = false

      for (const result of buyerResults) {
        if (
          orders.some((order) => order.id === result.requestId) ||
          ownedLicenses.some((license) => license.orderId === result.requestId)
        ) {
          continue
        }
        const offer = snapshot.offers.find(
          (item) =>
            item.id === result.offerId && item.sellerNpub === result.sellerNpub
        )
        const assetReference = offer?.listing.rgbAsset
        if (!offer || !assetReference?.assetId) {
          continue
        }
        const assetId = assetReference.assetId

        if (result.simulation && offer.simulation && isTestModeEnabled) {
          setP2PSimulationAssetBalance(assetId, 1)
          saveDemoRgbAsset({
            amount: 1,
            assetId,
            name: `${offer.listing.productName} (${offer.listing.edition})`,
            precision: 0,
            ticker:
              offer.listing.productName.replace(/[^a-zA-Z]/g, '').slice(0, 8) ||
              'LIC',
          })
        } else {
          if (assetReference.mode !== 'rgb-node') continue
          let spendableBalance = 0
          try {
            const balance = await getAssetBalance({
              asset_id: assetId,
            }).unwrap()
            spendableBalance = balance.spendable ?? 0
          } catch {
            waitingForAsset = true
            continue
          }
          if (spendableBalance < 1) {
            waitingForAsset = true
            continue
          }
        }

        const createdAt = result.completedAt || new Date().toISOString()
        const licenseRecord: LicenseRecord = {
          activationStatus: 'unknown',
          id: `license-${result.requestId}`,
          licenseStatus: 'active',
          listing: {
            ...offer.listing,
            rgbAsset: {
              ...assetReference,
              status: 'issued',
            },
          },
          orderId: result.requestId,
          transferCount: offer.transferCount + 1,
        }
        const order: Order = {
          buyerId: result.buyerNpub,
          companyId: offer.listing.companyId,
          createdAt,
          id: result.requestId,
          licexFee: 0,
          listing: offer.listing,
          listingId: offer.listing.id,
          orderStatus: 'completed',
          paymentMethod: 'usdt_swap',
          paymentStatus: 'received',
          price: offer.resalePriceUsdt,
          royalty: 0,
          sellerId: result.sellerNpub,
          totalPrice: offer.resalePriceUsdt,
          type: 'resale',
        }
        dispatch(completePurchase({ licenseRecord, order }))
        importedCount += 1
      }

      setP2pSyncMessage(
        importedCount > 0
          ? `${importedCount} licenza/e ricevuta/e aggiunta/e al portafoglio.`
          : waitingForAsset
            ? 'Swap confermato dal relay; il nodo non mostra ancora la licenza ricevuta. Riprova tra poco.'
            : 'Nessun nuovo acquisto P2P completato per questo nodo.'
      )
    } catch (error) {
      setP2pSyncMessage(
        error instanceof Error
          ? error.message
          : 'Sincronizzazione acquisti P2P non riuscita.'
      )
    } finally {
      setIsSyncingP2PPurchases(false)
    }
  }

  const executeP2PPurchase = async (purchase: IncomingP2PPurchase) => {
    const { offer, request } = purchase
    if (executingPurchaseId || !offer.swapString) return
    const isSimulationOffer =
      offer.simulation === true || offer.listing.rgbAsset?.mode === 'demo'
    setExecutingPurchaseId(request.id)
    setPurchaseExecutionMessage(null)
    try {
      if (isSimulationOffer && isTestModeEnabled) {
        const assetId = offer.listing.rgbAsset?.assetId
        if (!assetId || getP2PSimulationAssetBalance(assetId) < 1) {
          throw new Error('Il venditore non possiede più questa licenza demo.')
        }
        setP2PSimulationAssetBalance(assetId, 0)
        removeDemoRgbAsset(assetId)
        setTestWalletBalance(
          adjustP2PSimulationUsdtBalance(offer.resalePriceUsdt)
        )
      } else {
        const secret = await getP2PSwapSecret(offer.id)
        if (!secret) {
          throw new Error(
            'Segreto dello swap non disponibile su questo account o dispositivo.'
          )
        }
        await makerExecute({
          payment_secret: secret,
          swapstring: offer.swapString,
          taker_pubkey: request.buyerNodePubkey,
        }).unwrap()
      }

      const { nostrEventId: _nostrEventId, ...offerPayload } = offer
      const completedOffer = { ...offerPayload, status: 'completed' as const }
      dispatch(
        addP2pOffer({
          ...completedOffer,
          nostrEventId: offer.nostrEventId,
        })
      )
      const updatedLicenses = ownedLicenses.map((license) =>
        license.id === offer.licenseRecordId && license.listing.rgbAsset
          ? {
              ...license,
              listing: {
                ...license.listing,
                rgbAsset: {
                  ...license.listing.rgbAsset,
                  status: 'transferred' as const,
                },
              },
            }
          : license
      )
      dispatch(setOwnedLicenses(updatedLicenses))
      saveLocalOwnedLicenses(updatedLicenses)
      setIncomingPurchases((current) =>
        current.filter((item) => item.request.id !== request.id)
      )

      let publishedEvent: string | null = null
      let publishedResult: string | null = null
      try {
        publishedEvent = await publishMarketplaceResaleOffer(completedOffer)
        publishedResult = await publishMarketplacePurchaseResult({
          buyerNodePubkey: request.buyerNodePubkey,
          buyerNpub: request.buyerNpub,
          completedAt: new Date().toISOString(),
          offerId: offer.id,
          requestId: request.id,
          sellerNpub: offer.sellerNpub,
          status: 'completed',
          ...(isSimulationOffer ? { simulation: true } : {}),
        })
      } catch (error) {
        logger.warn(
          '[LICEX Marketplace] Could not publish swap completion:',
          error
        )
      }
      try {
        await deleteP2PSwapSecret(offer.id)
      } catch (error) {
        logger.warn(
          '[LICEX Marketplace] Could not remove completed swap secret:',
          error
        )
      }
      setPurchaseExecutionMessage(
        publishedEvent && publishedResult
          ? `Swap completato: ${offer.listing.productName} trasferita e offerta chiusa.`
          : 'Swap completato, ma il relay non ha confermato la chiusura o l’esito. Verifica la sincronizzazione prima di riprovare.'
      )
    } catch (error) {
      setPurchaseExecutionMessage(
        error instanceof Error
          ? error.message
          : 'Completamento dello swap non riuscito.'
      )
    } finally {
      setExecutingPurchaseId(null)
    }
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
              My Licenses (RGB Assets)
            </h1>
            <p className="text-content-secondary text-sm mt-1 max-w-xl">
              Your software licenses tokenized as RGB assets on Bitcoin. Each
              license is persisted in your local database and cryptographically
              linked to your node.
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
              Reset Local DB
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#9B5094]/40 bg-[#9B5094]/10 hover:bg-[#9B5094]/20 text-[#9B5094] dark:text-[#CDF7F6] font-bold text-sm transition-all"
              onClick={() => setShowEulaAnalyzer((visible) => !visible)}
              type="button"
            >
              <FileSearch className="w-4 h-4" />
              {showEulaAnalyzer ? 'Close analyzer' : 'Analyze EULA'}
            </button>
            <button
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8FB8DE] to-[#9B5094] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(LICEX_MARKETPLACE_PATH)}
              type="button"
            >
              Browse Marketplace
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
            Owned Licenses ({ownedLicenses.length})
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
            Order & Transaction History ({orders.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isP2PSimulationAvailable() && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3 dark:border-violet-400/30 dark:bg-violet-400/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-content-primary">
                  P2P Test Wallet
                </h2>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                  Development only
                </span>
              </div>
              <p className="mt-1 text-xs text-content-secondary">
                Simulate balances and transfers to test the Nostr flow. No real
                funds or RGB assets are created.
              </p>
              {isTestModeEnabled && (
                <p className="mt-2 text-sm font-semibold text-violet-800 dark:text-violet-200">
                  Demo balance:{' '}
                  {testWalletBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  USDT
                </p>
              )}
              {testWalletMessage && (
                <p
                  aria-live="polite"
                  className="mt-2 text-xs text-content-secondary"
                >
                  {testWalletMessage}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800"
                onClick={activateTestWallet}
                type="button"
              >
                Enable / fund test wallet
              </button>
              <button
                className="rounded-lg border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-800 disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-200"
                disabled={!isTestModeEnabled}
                onClick={() => void createTestLicense()}
                type="button"
              >
                Create demo license
              </button>
              <button
                className="rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-content-secondary disabled:opacity-50"
                disabled={!isTestModeEnabled}
                onClick={() => {
                  resetP2PSimulationWallet()
                  setTestWalletBalance(getP2PSimulationUsdtBalance())
                  setTestAssetBalanceRevision((revision) => revision + 1)
                  setTestWalletMessage(
                    'Portafoglio demo ripristinato a 1.000 USDT; gli asset demo sono stati azzerati.'
                  )
                }}
                type="button"
              >
                Reset test wallet
              </button>
            </div>
          </div>
        </section>
      )}
      <section className="flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-content-primary">
            Completed P2P Purchases
          </h2>
          <p className="mt-1 text-xs text-content-secondary">
            Verifica gli esiti Nostr e aggiungi al portafoglio le licenze già
            ricevute dal nodo.
          </p>
          {p2pSyncMessage && (
            <p
              aria-live="polite"
              className="mt-2 text-xs text-content-secondary"
            >
              {p2pSyncMessage}
            </p>
          )}
        </div>
        <button
          className="w-fit rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={
            !isPortfolioLoaded ||
            isSyncingP2PPurchases ||
            (!isTestModeEnabled && !nodeInfo?.pubkey)
          }
          onClick={() => void syncCompletedP2PPurchases()}
          type="button"
        >
          {isSyncingP2PPurchases ? 'Verifica…' : 'Sincronizza acquisti'}
        </button>
      </section>
      {(incomingPurchases.length > 0 || purchaseExecutionMessage) && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-content-primary">
              Richieste d’acquisto P2P
            </h2>
            <p className="mt-1 text-xs text-content-secondary">
              {incomingPurchases.length > 0
                ? 'Gli acquirenti hanno autorizzato lo swap sul proprio nodo. Completa qui il trasferimento atomico.'
                : 'Ultimo esito della compravendita atomica.'}
            </p>
          </div>
          {purchaseExecutionMessage && (
            <p aria-live="polite" className="text-sm text-content-secondary">
              {purchaseExecutionMessage}
            </p>
          )}
          {incomingPurchases.map((purchase) => (
            <article
              className="flex flex-col gap-2 rounded-xl border border-border-default/50 bg-surface-overlay p-3 sm:flex-row sm:items-center sm:justify-between"
              key={purchase.request.id}
            >
              <div>
                <p className="text-sm font-semibold text-content-primary">
                  {purchase.offer.listing.productName}
                </p>
                <p className="text-xs text-content-secondary">
                  {purchase.offer.resalePriceUsdt.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  USDT · nodo acquirente{' '}
                  {purchase.request.buyerNodePubkey.slice(0, 14)}…
                </p>
              </div>
              <button
                className="w-fit rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                disabled={
                  executingPurchaseId !== null || !purchase.offer.swapString
                }
                onClick={() => void executeP2PPurchase(purchase)}
                type="button"
              >
                {executingPurchaseId === purchase.request.id
                  ? 'Completamento swap…'
                  : 'Completa scambio atomico'}
              </button>
            </article>
          ))}
        </section>
      )}
      {showEulaAnalyzer ? (
        <section className="space-y-4 rounded-2xl border border-border-default bg-surface-overlay p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-content-primary">
                Analizzatore EULA
              </h2>
              <p className="text-xs text-content-secondary">
                {isTestModeEnabled
                  ? 'Analizza i termini e crea una licenza simulata acquistabile con demo-USDT.'
                  : 'Analizza i termini e pubblica la licenza come RGB UDA.'}
              </p>
            </div>
            <button
              aria-label="Chiudi analizzatore EULA"
              className="rounded-lg p-2 text-content-secondary hover:bg-surface-elevated hover:text-content-primary"
              onClick={() => setShowEulaAnalyzer(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <EulaAnalyzerTab
            demoModeEnabled={isTestModeEnabled}
            onPublished={() => setShowEulaAnalyzer(false)}
          />
        </section>
      ) : activeTab === 'licenses' ? (
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
                        {listing.price.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{' '}
                        {listing.paymentAsset === 'demo-USDT'
                          ? 'demo-USDT'
                          : 'sats'}
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
                No licenses found
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
                const hasActiveOffer = p2pOffers.some(
                  (offer) =>
                    offer.licenseRecordId === lic.id &&
                    offer.status === 'active'
                )
                const withinTransferLimit =
                  lic.listing.maxTransfers === null ||
                  lic.transferCount < lic.listing.maxTransfers
                const licenseAssetId = lic.listing.rgbAsset?.assetId
                const isNodeBackedLicense =
                  (lic.listing.rgbAsset?.mode === 'rgb-node' &&
                    lic.listing.rgbAsset.status === 'issued' &&
                    [
                      ...(nodeAssets?.nia ?? []),
                      ...(nodeAssets?.uda ?? []),
                      ...(nodeAssets?.cfa ?? []),
                      ...(nodeAssets?.ifa ?? []),
                    ].some((asset) => asset.asset_id === licenseAssetId)) ||
                  (isTestModeEnabled &&
                    lic.listing.rgbAsset?.mode === 'demo' &&
                    getP2PSimulationAssetBalance(licenseAssetId ?? '') >= 1)
                const isDemoAsset =
                  isTestModeEnabled && lic.listing.rgbAsset?.mode === 'demo'
                const meetsHoldingPeriod =
                  isDemoAsset ||
                  lic.listing.minHoldingDays === null ||
                  !lic.activatedAt ||
                  Date.now() - new Date(lic.activatedAt).getTime() >=
                    lic.listing.minHoldingDays * 24 * 60 * 60 * 1000
                const remainingHoldingDays =
                  lic.listing.minHoldingDays !== null && lic.activatedAt
                    ? Math.ceil(
                        (lic.listing.minHoldingDays * 24 * 60 * 60 * 1000 -
                          (Date.now() - new Date(lic.activatedAt).getTime())) /
                          (24 * 60 * 60 * 1000)
                      )
                    : 0
                const resaleBlockReason =
                  lic.listing.transferPolicy !== 'transferable_free'
                    ? 'La policy della licenza non consente la rivendita libera.'
                    : !withinTransferLimit
                      ? 'È stato raggiunto il numero massimo di trasferimenti.'
                      : !isNodeBackedLicense
                        ? 'Asset non disponibile nel nodo o nel portafoglio demo.'
                        : !meetsHoldingPeriod
                          ? `Periodo minimo di possesso: attendi ancora ${remainingHoldingDays} giorni.`
                          : 'Pubblica un’offerta di rivendita.'
                const canResell =
                  lic.licenseStatus === 'active' &&
                  lic.listing.transferPolicy === 'transferable_free' &&
                  withinTransferLimit &&
                  isNodeBackedLicense &&
                  meetsHoldingPeriod
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
                          {lic.licenseStatus === 'active'
                            ? 'Active'
                            : lic.licenseStatus}
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
                            Transfer Policy
                          </span>
                          <span className="font-semibold text-content-primary">
                            {lic.listing.transferPolicy === 'transferable_free'
                              ? 'Libero'
                              : 'Con Approvazione'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-elevated/40 border border-border-subtle">
                          <span className="text-content-tertiary block text-[10px]">
                            Transfers
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
                        className="flex items-center gap-1 text-primary hover:underline font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canResell || hasActiveOffer}
                        onClick={() => {
                          setSellingLicenseId(lic.id)
                          setResalePrice('')
                          setSellMessage(null)
                        }}
                        title={
                          hasActiveOffer
                            ? 'Questa licenza ha già un’offerta attiva'
                            : resaleBlockReason
                        }
                        type="button"
                      >
                        {hasActiveOffer
                          ? 'Offerta attiva'
                          : canResell
                            ? 'Metti in vendita'
                            : !meetsHoldingPeriod
                              ? `Attendi ${remainingHoldingDays} gg`
                              : !isNodeBackedLicense
                                ? 'Asset non disponibile'
                                : 'Non rivendibile'}
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
                    <th className="p-3.5 font-semibold">Prezzo</th>
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
                        {order.price.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{' '}
                        {order.listing.paymentAsset === 'demo-USDT'
                          ? 'demo-USDT'
                          : 'sats'}
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
      {selectedLicense && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSellingLicenseId(null)}
          role="dialog"
        >
          <section
            className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-content-primary">
                  Metti in vendita la licenza
                </h2>
                <p className="mt-1 text-sm text-content-secondary">
                  {selectedLicense.listing.productName} · usata.{' '}
                  {selectedLicense.listing.rgbAsset?.mode === 'demo'
                    ? 'Verrà pubblicata un’offerta di scambio simulata sui relay Nostr.'
                    : 'Verrà creato uno swap atomico RGB-USDT dal nodo.'}
                </p>
              </div>
              <Tag className="h-5 w-5 shrink-0 text-primary" />
            </div>
            <label className="mt-5 block text-sm font-medium text-content-primary">
              Prezzo di rivendita (USDT)
              <input
                autoFocus
                className="mt-2 w-full rounded-xl border border-border-default bg-surface-elevated px-3 py-2.5 text-content-primary outline-none focus:border-primary"
                min="0.01"
                onChange={(event) => setResalePrice(event.target.value)}
                placeholder="es. 65"
                step="0.01"
                type="number"
                value={resalePrice}
              />
            </label>
            {sellMessage && (
              <p
                aria-live="polite"
                className={`mt-3 text-sm ${
                  sellMessage.startsWith('Offerta pubblicata')
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {sellMessage}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-border-default px-4 py-2 text-sm text-content-secondary hover:text-content-primary"
                disabled={isPublishingOffer}
                onClick={() => setSellingLicenseId(null)}
                type="button"
              >
                Chiudi
              </button>
              <button
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                disabled={
                  isPublishingOffer ||
                  sellMessage?.startsWith('Offerta pubblicata')
                }
                onClick={() => void submitResaleOffer()}
                type="button"
              >
                {isPublishingOffer ? 'Pubblicazione…' : 'Pubblica offerta'}
              </button>
            </div>
          </section>
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
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-default bg-surface-overlay shadow-2xl"
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
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-surface-elevated p-4 text-[11px] leading-relaxed text-content-secondary">
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
