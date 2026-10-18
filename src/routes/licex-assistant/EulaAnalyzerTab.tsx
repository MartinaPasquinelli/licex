// ─── QVAC EULA Analyzer Interactive Tab ──────────────────────────────────────
// High-impact UI for uploading, pasting, and analyzing license agreements.
// Implements US-05 (Structured extraction) and US-06 (Compliance audit).

import { useState } from 'react'
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Layers,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { useAppDispatch } from '../../app/store/hooks'
import { mintLicenseListing } from '../../slices/licex/licex.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { QvacEulaAnalyzer } from '../../services/qvac/eula-analyzer'
import { EULA_SAMPLES } from '../../services/qvac/eula-samples'
import type { EulaAnalysisResult } from '../../services/qvac/eula-types'
import type { TransferPolicy } from '../../types/licex'
import { LicexMarkdown } from '../../components/LicexMarkdown'
import {
  createIssuanceInputFromEula,
  issueLicenseRgbAsset,
} from '../../services/licex/licenseAssetIssuer'
import type { IssuedLicenseAsset } from '../../services/licex/licenseAssetIssuer'
import { toast } from 'react-toastify'

interface EulaAnalyzerTabProps {
  onPublished?: () => void
}

const getNodeErrorMessage = (error: unknown): string => {
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
  }
  return 'Errore sconosciuto durante la pubblicazione RGB UDA.'
}

const isMissingUncoloredUtxo = (error: unknown): boolean =>
  getNodeErrorMessage(error).toLowerCase().includes('no uncolored utxos')

export function EulaAnalyzerTab({ onPublished }: EulaAnalyzerTabProps) {
  const dispatch = useAppDispatch()

  const [contractText, setContractText] = useState(EULA_SAMPLES[0].text)
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    EULA_SAMPLES[0].id
  )
  const [claimedPolicy, setClaimedPolicy] = useState<TransferPolicy | ''>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] =
    useState<EulaAnalysisResult | null>(null)
  const [copiedJson, setCopiedJson] = useState(false)
  const [publishedSuccess, setPublishedSuccess] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [showContract, setShowContract] = useState(false)
  const [expandedSampleIds, setExpandedSampleIds] = useState<Set<string>>(
    new Set()
  )
  const [issueUda] = nodeApi.endpoints.issueUdaAsset.useMutation()
  const [createUtxos] = nodeApi.endpoints.createUtxos.useMutation()
  const [signMessage] = nodeApi.endpoints.signMessage.useMutation()
  const [getNetworkInfo] = nodeApi.endpoints.networkInfo.useLazyQuery()
  const [getNodeInfo] = nodeApi.endpoints.nodeInfo.useLazyQuery()

  const handleSelectSample = (sampleId: string) => {
    const sample = EULA_SAMPLES.find((s) => s.id === sampleId)
    if (sample) {
      setSelectedSampleId(sample.id)
      setContractText(sample.text)
      setAnalysisResult(null)
      setPublishedSuccess(false)
    }
  }

  const handleAnalyze = () => {
    if (!contractText.trim()) return

    setIsAnalyzing(true)
    setPublishedSuccess(false)

    // Simulate snappy local SLM inference cycle (400ms)
    setTimeout(() => {
      const result = QvacEulaAnalyzer.analyze(
        contractText,
        claimedPolicy ? claimedPolicy : undefined
      )
      setAnalysisResult(result)
      setIsAnalyzing(false)
    }, 450)
  }

  const handleCopyJson = () => {
    if (!analysisResult) return
    navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const handlePublishToMarketplace = async () => {
    if (!analysisResult || isPublishing || publishedSuccess) return

    setIsPublishing(true)
    setPublishError(null)
    try {
      const network = await getNetworkInfo().unwrap()
      if (network.network === 'Mainnet') {
        throw new Error(
          'Pubblicazione dei termini EULA bloccata su Mainnet. Collega il nodo a Mutinynet o Regtest.'
        )
      }

      const issuer = await getNodeInfo().unwrap()
      const requestId = crypto.randomUUID()
      const { extracted, suggestedListing } = analysisResult
      const issuanceInput = createIssuanceInputFromEula(
        analysisResult,
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

      const suggestedPrice = Number(suggestedListing.price)
      const price =
        suggestedPrice > 0
          ? suggestedPrice
          : extracted.licenseType === 'perpetual'
            ? 45000
            : 15000
      const productSlug =
        extracted.productName.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        'unverified-publisher'

      dispatch(
        mintLicenseListing({
          company: {
            companyStatus: 'pending',
            domain: `${productSlug}.invalid`,
            name: `${extracted.productName} publisher (non verificato)`,
          },
          edition: issuanceInput.edition,
          id: `lic-${requestId}`,
          listingDetails: {
            category: suggestedListing.category || 'Software & Tools',
            durationDays: extracted.durationDays,
            licenseType: extracted.licenseType,
            platforms: [...extracted.platforms],
            productDescription: analysisResult.executiveSummary,
            tags: suggestedListing.tags || [
              issuanceInput.edition,
              extracted.licenseType,
              ...extracted.platforms,
            ],
            version: issuanceInput.version,
          },
          price,
          productName: issuanceInput.productName,
          rgbAsset: issuedAsset,
          royaltyPercent: issuanceInput.royaltyPercent,
          transferPolicy: issuanceInput.transferPolicy,
        })
      )

      toast.success(`UDA emessa e inserzione pubblicata su ${network.network}.`)
      setPublishedSuccess(true)
      onPublished?.()
    } catch (error) {
      const message = getNodeErrorMessage(error)
      setPublishError(message)
      toast.error(message)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Privacy & Engine Badge Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                QVAC Legal Engine v1.0
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Locale
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero Cloud Telemetry</span>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input and Sample Selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Contratto EULA / Termini
              </label>
              <span className="text-xs text-slate-400">
                {contractText.length} caratteri
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1.5">
                {EULA_SAMPLES.map((sample) => {
                  const isSelected = selectedSampleId === sample.id
                  const isExpanded = expandedSampleIds.has(sample.id)
                  return (
                    <button
                      className={`text-left p-2.5 rounded-lg text-xs transition border flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      }`}
                      key={sample.id}
                      onClick={() => {
                        handleSelectSample(sample.id)
                        setExpandedSampleIds((current) => {
                          const next = new Set(current)
                          if (next.has(sample.id)) next.delete(sample.id)
                          else next.add(sample.id)
                          return next
                        })
                      }}
                      type="button"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white">
                          {sample.title}
                        </div>
                        {isExpanded && (
                          <div className="mt-0.5 text-left text-[11px] text-slate-400">
                            {sample.subtitle}
                          </div>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded font-mono ${
                            sample.expectedPolicy === 'transferable_free'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : sample.expectedPolicy ===
                                  'transferable_with_approval'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {sample.expectedPolicy}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-left text-xs font-medium text-slate-200 hover:border-cyan-500/50"
              onClick={() => setShowContract((visible) => !visible)}
              type="button"
            >
              <span>
                {showContract
                  ? 'Nascondi contratto'
                  : 'Visualizza contratto EULA'}
              </span>
              {showContract ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showContract && (
              <div>
                <textarea
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  onChange={(e) => {
                    setContractText(e.target.value)
                    setSelectedSampleId('')
                  }}
                  placeholder="Incolla qui il testo del contratto di licenza o EULA..."
                  rows={10}
                  value={contractText}
                />
              </div>
            )}

            {/* Optional Vendor Claim Cross-Check (US-06 Audit) */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Audit di Conformità (US-06)
                </span>
                <span className="text-[10px] text-slate-500">Opzionale</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Seleziona cosa dichiara il venditore per testare se QVAC rileva
                incongruenze o tentativi di frode:
              </p>
              <select
                className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                onChange={(e) =>
                  setClaimedPolicy(e.target.value as TransferPolicy | '')
                }
                value={claimedPolicy}
              >
                <option value="">Nessuna dichiarazione (Analisi cieca)</option>
                <option value="transferable_free">
                  Dichiara: Trasferimento Libero
                </option>
                <option value="transferable_with_approval">
                  Dichiara: Trasferimento con Approvazione
                </option>
                <option value="not_transferable">
                  Dichiara: Non Trasferibile
                </option>
              </select>
            </div>

            {/* Analyze Action Button */}
            <button
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              disabled={isAnalyzing || !contractText.trim()}
              onClick={handleAnalyze}
              type="button"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Elaborazione Locale QVAC...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analizza Licenza con QVAC
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results & Extracted Intelligence */}
        <div className="lg:col-span-7">
          {!analysisResult ? (
            <div className="h-full min-h-[480px] flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/50 border border-slate-800 border-dashed text-center text-slate-400 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-800/60 text-slate-400 border border-slate-700/60">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                Nessuna Analisi Eseguita
              </h3>
              <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                Seleziona uno dei contratti di esempio a sinistra oppure incolla
                il testo di un EULA, poi premi{' '}
                <strong>"Analizza Licenza con QVAC"</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Result Overview Header Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        {analysisResult.extracted.productName}
                      </h2>
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-800 border border-slate-700 text-slate-300">
                        v{analysisResult.extracted.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Edizione:{' '}
                      <strong className="text-slate-200">
                        {analysisResult.extracted.edition}
                      </strong>{' '}
                      • Analisi completata in {analysisResult.processingTimeMs}
                      ms
                    </p>
                  </div>

                  {/* Transferability Status Badge */}
                  <div>
                    {analysisResult.extracted.transferPolicy ===
                      'transferable_free' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        Trasferimento Libero (RGB secondary market)
                      </div>
                    )}
                    {analysisResult.extracted.transferPolicy ===
                      'transferable_with_approval' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        Rivendita con Approvazione & Royalty (
                        {analysisResult.extracted.royaltyEstimatePercent ?? 5}%)
                      </div>
                    )}
                    {analysisResult.extracted.transferPolicy ===
                      'not_transferable' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                        <XCircle className="w-4 h-4" />
                        Non Trasferibile (Vincolo Personale)
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Warning Banner if Flagged (US-06) */}
                {analysisResult.complianceAudit.aiReviewStatus ===
                  'flagged' && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-rose-300">
                        Incongruenza di Conformità Rilevata (US-06)
                      </div>
                      <p className="text-rose-200/90 leading-relaxed">
                        {analysisResult.complianceAudit.flagReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Extracted Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Tipo Licenza
                    </span>
                    <span className="text-xs font-semibold text-white capitalize">
                      {analysisResult.extracted.licenseType}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Postazioni (Seats)
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {analysisResult.extracted.seatsAllowed} dispositivo/i
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Uso Commerciale
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        analysisResult.extracted.commercialUseAllowed
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {analysisResult.extracted.commercialUseAllowed
                        ? 'Autorizzato'
                        : 'Limitato/Personale'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Piattaforme
                    </span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {analysisResult.extracted.platforms.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Card (Rendered Markdown) */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Sintesi Esecutiva QVAC
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    Formattata per Descrizione Marketplace
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <LicexMarkdown content={analysisResult.executiveSummary} />
                </div>
              </div>

              {/* Grounded Legal Clauses (With Exact Text Quotes) */}
              <details className="group space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    Clausole rilevate e testo originale
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-normal normal-case tracking-normal text-slate-400">
                    {analysisResult.clauses.length} clausole
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>

                <div className="space-y-2.5 pt-1">
                  {analysisResult.clauses.map((clause) => (
                    <div
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                      key={clause.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {clause.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            clause.riskLevel === 'safe'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : clause.riskLevel === 'warning'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {clause.riskLevel === 'safe'
                            ? 'Conforme'
                            : clause.riskLevel === 'warning'
                              ? 'Attenzione'
                              : 'Rischio'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {clause.summary}
                      </p>

                      {/* Original Contract Quote Snippet */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400 italic">
                        "{clause.originalQuote}"
                      </div>

                      {clause.riskReason && (
                        <p className="text-[11px] text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {clause.riskReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>

              {/* Action Bar (Export JSON and Create Marketplace Listing) */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {publishError && (
                  <div
                    className="w-full rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"
                    role="alert"
                  >
                    {publishError}
                  </div>
                )}
                <button
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  onClick={handleCopyJson}
                  type="button"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      JSON Metadati Copiato!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Esporta Metadati RGB-21 (JSON)
                    </>
                  )}
                </button>

                <button
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition shadow flex items-center gap-1.5 cursor-pointer ${
                    publishedSuccess
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
                  }`}
                  disabled={publishedSuccess || isPublishing}
                  onClick={() => void handlePublishToMarketplace()}
                  type="button"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Firma, crea UDA e pubblica…
                    </>
                  ) : publishedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Licenza Pubblicata nel Marketplace!
                    </>
                  ) : (
                    <>
                      Pre-compila & Pubblica Inserzione
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
