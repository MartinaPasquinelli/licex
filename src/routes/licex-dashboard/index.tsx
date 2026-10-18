// ─── LICEX Company & Publisher Dashboard ──────────────────────────────────────
// Issuer interface: manage issued software licenses, monitor primary/secondary royalties,
// approve transfer requests, and mint new RGB license batches.

import React, { useState } from 'react'
import {
  Building2,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  KeyRound,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useSearchParams } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { mintLicenseListing } from '../../slices/licex/licex.slice'
import { issueLicenseRgbAsset } from '../../services/licex/licenseAssetIssuer'

function formatSats(sats: number): string {
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K sats`
  return `${sats.toLocaleString()} sats`
}

export function Component() {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const { companyStats, listings } = useAppSelector((s) => s.licex)
  const [activeTab, setActiveTab] = useState<'listings' | 'transfers' | 'mint'>(
    searchParams.get('tab') === 'mint' ? 'mint' : 'listings'
  )

  // Manual issuer form; EULA-driven UDA publication lives in My Licenses.
  const [mintName, setMintName] = useState('')
  const [mintEdition, setMintEdition] = useState('')
  const [mintPrice, setMintPrice] = useState('')
  const [mintTransferPolicy, setMintTransferPolicy] =
    useState('transferable_free')
  const [mintRoyalty, setMintRoyalty] = useState('5')
  const [mintNotice, setMintNotice] = useState<string | null>(null)
  const [isIssuing, setIsIssuing] = useState(false)
  const [issueUda] = nodeApi.endpoints.issueUdaAsset.useMutation()
  const [signMessage] = nodeApi.endpoints.signMessage.useMutation()
  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()
  const [getNodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const companyListings = listings.filter(
    (l) => l.companyId === 'comp-1' || l.companyId === 'comp-2'
  )

  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isIssuing) return
    const priceSats = Number(mintPrice) || 0
    const royalty = Number(mintRoyalty) || 0
    const requestId = crypto.randomUUID()
    setIsIssuing(true)
    try {
      const network = await getNetworkInfo().unwrap()
      if (network.network === 'Mainnet') {
        throw new Error(
          'Emissione di prova bloccata su Mainnet. Collega il nodo a Mutinynet o Regtest.'
        )
      }
      const issuer = await getNodeInfo().unwrap()
      const issuanceInput = {
        edition: mintEdition,
        productName: mintName,
        requestId,
        royaltyPercent: royalty,
        transferPolicy: mintTransferPolicy as
          | 'transferable_free'
          | 'transferable_with_approval'
          | 'not_transferable',
        version: '2026.1',
      }
      const issuedAsset = await issueLicenseRgbAsset(
        issuanceInput,
        (request) => issueUda(request).unwrap(),
        async (message) =>
          (await signMessage({ message }).unwrap()).signed_message,
        issuer.pubkey
      )

      dispatch(
        mintLicenseListing({
          edition: issuanceInput.edition,
          id: `lic-${requestId}`,
          price: priceSats,
          productName: issuanceInput.productName,
          rgbAsset: issuedAsset,
          royaltyPercent: royalty,
          transferPolicy: issuanceInput.transferPolicy,
        })
      )

      toast.success(
        `Licenza RGB UDA emessa su ${network.network} e pubblicata!`
      )
      setMintNotice(
        `✓ Licenza pubblicata dopo conferma del nodo RGB. Asset/contratto: ${issuedAsset.contractId}; hash metadati: ${issuedAsset.metadataHash.slice(0, 16)}…`
      )
      setMintName('')
      setMintEdition('')
      setMintPrice('')
      setTimeout(() => setActiveTab('listings'), 1200)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Emissione fallita'
      toast.error(message)
      setMintNotice(`✕ Pubblicazione annullata: ${message}`)
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[rgb(var(--app-content-primary))] flex items-center gap-2">
                <Building2 className="w-7 h-7 text-indigo-400" />
                Publisher Dashboard
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Verified Issuer
              </span>
            </div>
            <p className="text-sm text-[rgb(var(--app-content-secondary))] mt-1">
              JetBrains s.r.o. · Issuer Node #jb-rgb-node-01 · Mutinynet
              Connected
            </p>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 bg-[rgb(var(--app-surface-secondary))]/50 border border-[rgb(var(--app-border-primary))]/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--app-content-secondary))]">
              <span>Primary Sales Volume</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
              {formatSats(companyStats.totalRevenueSats)}
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Direct primary sales ({companyStats.totalSales} total)
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-[rgb(var(--app-surface-secondary))]/50 border border-[rgb(var(--app-border-primary))]/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--app-content-secondary))]">
              <span>Secondary Market Royalties</span>
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
              {formatSats(Math.round(companyStats.totalRevenueSats * 0.12))}
            </div>
            <p className="text-[11px] text-purple-400">
              Autonomous on-chain splits
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-[rgb(var(--app-surface-secondary))]/50 border border-[rgb(var(--app-border-primary))]/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--app-content-secondary))]">
              <span>Active Issued Licenses</span>
              <KeyRound className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
              {companyStats.activeLicenses}
            </div>
            <p className="text-[11px] text-[rgb(var(--app-content-secondary))]">
              Across active software suites
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-[rgb(var(--app-surface-secondary))]/50 border border-[rgb(var(--app-border-primary))]/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--app-content-secondary))]">
              <span>Pending Activations</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--app-content-primary))]">
              {companyStats.pendingActivations}
            </div>
            <p className="text-[11px] text-amber-400">
              Awaiting client node handshake
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[rgb(var(--app-border-primary))]/30 gap-6 text-sm">
          <button
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'listings'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-[rgb(var(--app-content-secondary))] hover:text-white'
            }`}
            onClick={() => setActiveTab('listings')}
          >
            Catalog Listings ({companyListings.length})
          </button>
          <button
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'transfers'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-[rgb(var(--app-content-secondary))] hover:text-white'
            }`}
            onClick={() => setActiveTab('transfers')}
          >
            Transfer Approvals ({companyStats.pendingActivations})
          </button>
          <button
            className={`pb-3 font-semibold transition-colors relative ${
              activeTab === 'mint'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-[rgb(var(--app-content-secondary))] hover:text-white'
            }`}
            onClick={() => setActiveTab('mint')}
          >
            Issue New Asset
          </button>
        </div>

        {/* Tab 1: Listings */}
        {activeTab === 'listings' && (
          <div className="space-y-3">
            {companyListings.map((item) => (
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl
                  bg-[rgb(var(--app-surface-secondary))]/40
                  border border-[rgb(var(--app-border-primary))]/20 gap-4"
                key={item.id}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[rgb(var(--app-content-primary))]">
                      {item.productName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                      {item.edition}
                    </span>
                  </div>
                  <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-1">
                    Policy:{' '}
                    <span className="font-medium text-white">
                      {item.transferPolicy}
                    </span>{' '}
                    · Royalty: {item.royaltyPercent}% · Platforms:{' '}
                    {item.platforms.join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-sm font-bold text-[rgb(var(--app-content-primary))]">
                      {formatSats(item.price)}
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      Status: Published
                    </span>
                  </div>

                  <button className="px-3 py-1.5 rounded-lg text-xs bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-[rgb(var(--app-content-secondary))] hover:text-white">
                    Edit Terms
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Transfer Approvals */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                These secondary market transfers require issuer compliance
                sign-off under the <strong>transferable_with_approval</strong>{' '}
                policy before the RGB consignment can be validated.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[rgb(var(--app-surface-secondary))]/40 border border-[rgb(var(--app-border-primary))]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Transfer Request #TR-9821
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                    Pending Signature
                  </span>
                </div>
                <p className="text-xs text-[rgb(var(--app-content-secondary))]">
                  Product: <strong>GoLand Pro 2026</strong> · Current Holder:{' '}
                  <code className="text-purple-300">tb1q8...7k3w</code> → Buyer:{' '}
                  <code className="text-cyan-300">tb1q9...4m2x</code>
                </p>
                <p className="text-[11px] text-[rgb(var(--app-content-secondary))]">
                  Proposed secondary price: <strong>110.000 sats</strong> ·
                  Calculated royalty to publisher:{' '}
                  <strong>8.800 sats (8%)</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                  onClick={() =>
                    alert(
                      'Transfer approved. Dual signature counter-signed and consignment broadcasted on Mutinynet.'
                    )
                  }
                >
                  Approve & Sign
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-xs bg-[rgb(var(--app-surface-primary))] hover:bg-red-500/20 text-red-400 border border-[rgb(var(--app-border-primary))]/30 transition-all"
                  onClick={() => alert('Transfer rejected.')}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Mint New RGB License */}
        {activeTab === 'mint' && (
          <div className="rounded-2xl p-6 bg-[rgb(var(--app-surface-secondary))]/40 border border-[rgb(var(--app-border-primary))]/30 max-w-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                Issue New RGB Asset Batch
              </h2>
              <p className="text-xs text-[rgb(var(--app-content-secondary))] mt-0.5">
                Defines the contract schema, single-use-seal UTXO, and
                activation webhook for client licenses.
              </p>
            </div>

            {mintNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                {mintNotice}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleMintSubmit}>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Per pubblicare una licenza analizzata, usa l’Analizzatore EULA
                in “Le Mie Licenze”. Questa schermata resta disponibile per
                emissioni manuali.
              </div>
              <div>
                <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                  Product Title *
                </label>
                <input
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                  onChange={(e) => setMintName(e.target.value)}
                  placeholder="e.g. CLion C++ IDE Enterprise"
                  required
                  type="text"
                  value={mintName}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Edition / Tier *
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setMintEdition(e.target.value)}
                    placeholder="e.g. Commercial 2026"
                    required
                    type="text"
                    value={mintEdition}
                  />
                </div>

                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Primary Price (sats) *
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setMintPrice(e.target.value)}
                    placeholder="e.g. 250000"
                    required
                    type="number"
                    value={mintPrice}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Transferability Policy
                  </label>
                  <select
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setMintTransferPolicy(e.target.value)}
                    value={mintTransferPolicy}
                  >
                    <option value="transferable_free">
                      Freely Transferable
                    </option>
                    <option value="transferable_with_approval">
                      Approval Required
                    </option>
                    <option value="not_transferable">Non-transferable</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Resale Royalty (%)
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setMintRoyalty(e.target.value)}
                    placeholder="e.g. 5"
                    type="number"
                    value={mintRoyalty}
                  />
                </div>
              </div>

              <button
                className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500 transition-all"
                disabled={isIssuing}
                type="submit"
              >
                {isIssuing ? 'Issuing UDA…' : 'Mint & Deploy RGB UDA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

Component.displayName = 'LicexCompanyDashboardPage'
