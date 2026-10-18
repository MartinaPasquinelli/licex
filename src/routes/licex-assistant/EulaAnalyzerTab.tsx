// ─── QVAC EULA Analyzer Interactive Tab ──────────────────────────────────────
// High-impact UI for uploading, pasting, and analyzing license agreements.
// Provides structured extraction and an optional compliance cross-check.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { getMarketplaceIdentity } from '../../services/licexNostrMarketplace'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { QvacEulaAnalyzer } from '../../services/qvac/eula-analyzer'
import {
  buildEulaAnalysisPrompt,
  createEulaSourcePassages,
  EULA_TOPIC_LABELS,
  parseEulaAiReview,
  type EulaAiReview,
} from '../../services/qvac/eula-ai-review'
import { EULA_SAMPLES } from '../../services/qvac/eula-samples'
import type { EulaAnalysisResult } from '../../services/qvac/eula-types'
import type { TransferPolicy } from '../../types/licex'
import { LicexMarkdown } from '../../components/LicexMarkdown'
import { useMind } from '../../hooks/useMind'
import { KALEIDO_MIND_MODELS_PATH } from '../../app/router/paths'
import { isUsableQvacStatus } from '../../services/qvac/licex-assistant'
import { getRecommendedModelId } from '../kaleido-mind/modelCatalog'
import {
  createIssuanceInputFromEula,
  issueDemoLicenseAsset,
  issueLicenseRgbAsset,
} from '../../services/licex/licenseAssetIssuer'
import type { IssuedLicenseAsset } from '../../services/licex/licenseAssetIssuer'
import { toast } from 'react-toastify'

interface EulaAnalyzerTabProps {
  demoModeEnabled?: boolean
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

export function EulaAnalyzerTab({
  demoModeEnabled = false,
  onPublished,
}: EulaAnalyzerTabProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const mind = useMind()

  const [contractText, setContractText] = useState(EULA_SAMPLES[0].text)
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    EULA_SAMPLES[0].id
  )
  const [claimedPolicy, setClaimedPolicy] = useState<TransferPolicy | ''>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] =
    useState<EulaAnalysisResult | null>(null)
  const [aiReview, setAiReview] = useState<EulaAiReview | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [modelError, setModelError] = useState('')
  const [isStartingModel, setIsStartingModel] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  const [publishedSuccess, setPublishedSuccess] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [demoPrice, setDemoPrice] = useState('49.99')
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
      setAiReview(null)
      setAnalysisError('')
      setPublishedSuccess(false)
    }
  }

  const handleStartModel = async () => {
    const recommendedId = getRecommendedModelId(mind.catalog, mind.hardware)
    const model =
      mind.installed.find((installed) => installed.id === recommendedId) ??
      mind.installed.find((installed) => installed.active) ??
      mind.installed[0]
    if (!model) {
      setModelError(
        'Non ci sono modelli installati. Installa un modello nella sezione KaleidoMind > Models.'
      )
      return
    }

    setModelError('')
    setIsStartingModel(true)
    try {
      await mind.startProvider(model.id)
    } catch (error) {
      setModelError(
        `Avvio del modello non riuscito: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsStartingModel(false)
    }
  }

  const handleAnalyze = async () => {
    if (!contractText.trim()) return
    if (!isUsableQvacStatus(mind.status)) {
      setAnalysisError(
        'Avvia un modello QVAC locale prima di analizzare il contratto. Il testo non è stato inviato a un servizio AI cloud.'
      )
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAiReview(null)
    setPublishedSuccess(false)

    let heuristicResult: EulaAnalysisResult | null = null
    try {
      heuristicResult = QvacEulaAnalyzer.analyze(
        contractText,
        claimedPolicy ? claimedPolicy : undefined
      )
      const passages = createEulaSourcePassages(contractText.trim())
      const response = await mind.chat(
        buildEulaAnalysisPrompt(passages),
        undefined,
        `eula-review-${crypto.randomUUID()}`
      )
      const review = parseEulaAiReview(response.text, passages)
      setAiReview(review)
      setAnalysisResult({
        ...heuristicResult,
        processingTimeMs: response.latencyMs,
      })
    } catch (error) {
      setAiReview(null)
      if (heuristicResult) setAnalysisResult(heuristicResult)
      setAnalysisError(
        heuristicResult
          ? `Risposta AI non utilizzabile: ${error instanceof Error ? error.message : String(error)} È mostrata solo l’analisi euristica, basata su regole e non sull’AI.`
          : `Analisi non riuscita: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCopyJson = () => {
    if (!analysisResult) return
    navigator.clipboard.writeText(
      JSON.stringify(
        {
          aiReview,
          heuristicAnalysis: analysisResult,
        },
        null,
        2
      )
    )
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const handlePublishToMarketplace = async () => {
    if (!analysisResult || isPublishing || publishedSuccess) return

    setIsPublishing(true)
    setPublishError(null)
    try {
      const requestId = crypto.randomUUID()
      const { extracted, suggestedListing } = analysisResult
      const issuanceInput = createIssuanceInputFromEula(
        {
          ...analysisResult,
          aiReviewStatus: aiReview ? 'completed' : 'unavailable',
          confidenceScore: 0,
        },
        requestId
      )
      let issuedAsset: IssuedLicenseAsset
      let price: number

      if (demoModeEnabled) {
        price = Number(demoPrice)
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error('Inserisci un prezzo demo USDT maggiore di zero.')
        }
        issuedAsset = await issueDemoLicenseAsset(issuanceInput)
      } else {
        const network = await getNetworkInfo().unwrap()
        if (network.network === 'Mainnet') {
          throw new Error(
            'Pubblicazione dei termini EULA bloccata su Mainnet. Collega il nodo a Mutinynet o Regtest.'
          )
        }

        const issuer = await getNodeInfo().unwrap()
        const issue = () =>
          issueLicenseRgbAsset(
            issuanceInput,
            (request) => issueUda(request).unwrap(),
            async (message) =>
              (await signMessage({ message }).unwrap()).signed_message,
            issuer.pubkey
          )

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
        price =
          suggestedPrice > 0
            ? suggestedPrice
            : extracted.licenseType === 'perpetual'
              ? 45000
              : 15000
      }
      const productSlug =
        extracted.productName.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        'unverified-publisher'
      const publisherNpub = await getMarketplaceIdentity().catch(() => null)

      dispatch(
        mintLicenseListing({
          company: {
            companyStatus: 'pending',
            domain: `${productSlug}.invalid`,
            name: `${extracted.productName} publisher (non verificato)`,
          },
          edition: issuanceInput.edition,
          id: `lic-${requestId}`,
          ...(publisherNpub ? { publisherNpub } : {}),
          listingDetails: {
            category: suggestedListing.category || 'Software & Tools',
            durationDays: extracted.durationDays,
            licenseType: extracted.licenseType,
            ...(demoModeEnabled ? { paymentAsset: 'demo-USDT' } : {}),
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

      toast.success(
        demoModeEnabled
          ? 'Licenza demo pubblicata. Puoi acquistarla con demo-USDT.'
          : 'UDA emessa e inserzione pubblicata sul network del nodo.'
      )
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
                Analisi EULA QVAC
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                  isUsableQvacStatus(mind.status)
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                {isUsableQvacStatus(mind.status)
                  ? `Modello locale attivo${mind.status?.activeModelName ? ` · ${mind.status.activeModelName}` : ''}`
                  : 'Modello locale non attivo'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              L’AI locale individua e riassume clausole con citazioni
              controllate sul testo. È un supporto informativo, non una verifica
              legale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Inferenza QVAC sul dispositivo</span>
        </div>
      </div>
      {!isUsableQvacStatus(mind.status) && mind.installed.length > 0 && (
        <button
          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
          disabled={isStartingModel || mind.starting || !!mind.loading}
          onClick={() => void handleStartModel()}
          type="button"
        >
          {isStartingModel || mind.starting || mind.loading
            ? 'Avvio del modello locale…'
            : 'Avvia modello locale'}
        </button>
      )}
      <button
        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
        onClick={() => navigate(KALEIDO_MIND_MODELS_PATH)}
        type="button"
      >
        Scegli o installa un altro modello
      </button>
      {modelError && (
        <p
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
          role="alert"
        >
          {modelError}
        </p>
      )}
      {analysisError && (
        <p
          className={`rounded-lg border p-3 text-xs ${
            analysisResult
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
          role="alert"
        >
          {analysisError}
        </p>
      )}

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input and Sample Selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                EULA / License Terms
              </label>
              <span className="text-xs text-slate-400">
                {contractText.length} characters
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
                {showContract ? 'Hide contract' : 'View EULA contract'}
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
                    setAnalysisResult(null)
                    setAiReview(null)
                    setAnalysisError('')
                  }}
                  placeholder="Paste the license agreement or EULA text here..."
                  rows={10}
                  value={contractText}
                />
              </div>
            )}

            <details className="group rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Optional seller claim check
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
                  Optional
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-2 text-[11px] text-slate-400">
                Expand this section only if you want to compare the seller's
                claim with the terms detected in the contract.
              </p>
              <select
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                onChange={(e) => {
                  setClaimedPolicy(e.target.value as TransferPolicy | '')
                  setAnalysisResult(null)
                  setAiReview(null)
                }}
                value={claimedPolicy}
              >
                <option value="">No claim (blind analysis)</option>
                <option value="transferable_free">
                  Claims: Freely transferable
                </option>
                <option value="transferable_with_approval">
                  Claims: Approval required
                </option>
                <option value="not_transferable">
                  Claims: Not transferable
                </option>
              </select>
            </details>

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
                  Analisi del modello locale…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analizza con QVAC locale Analyze license with QVAC
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
                No analysis yet
              </h3>
              <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                Select a sample contract on the left or paste an EULA, then
                click <strong>"Analyze license with QVAC"</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              {aiReview && (
                <section className="space-y-3 rounded-2xl border border-cyan-500/30 bg-slate-900 p-5">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-cyan-200">
                      <Sparkles className="h-4 w-4" />
                      Lettura assistita dal modello locale
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Il modello seleziona passaggi numerati; il testo mostrato
                      è recuperato direttamente dal contratto originale.
                      L’interpretazione resta da controllare e non è una
                      conclusione legale.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {aiReview.findings.map((finding) => (
                      <article
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                        key={finding.topic}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold text-white">
                            {EULA_TOPIC_LABELS[finding.topic]}
                          </h3>
                          <span className="text-[10px] text-slate-400">
                            {finding.status === 'explicit'
                              ? 'Passaggio esplicito'
                              : finding.status === 'ambiguous'
                                ? 'Ambiguo / da verificare'
                                : 'Non individuato'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                          {finding.interpretation}
                        </p>
                        {finding.evidence && (
                          <blockquote className="mt-2 border-l-2 border-cyan-500/50 pl-3 font-mono text-[11px] italic text-slate-400">
                            “{finding.evidence}”
                          </blockquote>
                        )}
                      </article>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    {aiReview.caveat}
                  </p>
                </section>
              )}

              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200">
                Il riepilogo e gli attributi seguenti sono prodotti da regole
                euristiche, non dal modello AI. Possono essere errati e non
                verificano la validità legale del contratto.
              </p>

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
                        Resale requires approval & royalty ( Ipotesi euristica:
                        possibile approvazione (
                        {analysisResult.extracted.royaltyEstimatePercent ?? 5}%)
                      </div>
                    )}
                    {analysisResult.extracted.transferPolicy ===
                      'not_transferable' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                        <XCircle className="w-4 h-4" />
                        Not transferable (personal use restriction) Nessun
                        segnale di trasferibilità nelle regole
                      </div>
                    )}
                  </div>
                </div>
                {/* Audit Warning Banner if Flagged (US-06) */}
                {analysisResult.complianceAudit.reviewStatus === 'flagged' && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />

                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-rose-300">
                        Compliance mismatch detected
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
                      License Type
                    </span>
                    <span className="text-xs font-semibold text-white capitalize">
                      {analysisResult.extracted.licenseType}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Seats
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {analysisResult.extracted.seatsAllowed} device(s)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Commercial Use
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        analysisResult.extracted.commercialUseAllowed
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {analysisResult.extracted.commercialUseAllowed
                        ? 'Allowed'
                        : 'Limited/Personal'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Platforms
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
                    QVAC Executive Summary Sintesi euristica (regole, non AI)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    Formatted for marketplace description Riepilogo non
                    verificato
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
                    Detected clauses and original text
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-normal normal-case tracking-normal text-slate-400">
                    {analysisResult.clauses.length} clauses
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
                            ? 'Compliant'
                            : clause.riskLevel === 'warning'
                              ? 'Review'
                              : 'Risk'}
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

              {/* Action Bar (Export JSON and save a non-published draft) */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {demoModeEnabled && (
                  <div className="w-full rounded-lg border border-violet-400/30 bg-violet-500/10 p-3 text-xs text-violet-100">
                    <label className="flex flex-wrap items-center gap-2 font-semibold">
                      Prezzo demo (USDT)
                      <input
                        className="w-28 rounded-md border border-violet-300/30 bg-slate-950 px-2 py-1 text-white"
                        min="0.01"
                        onChange={(event) => setDemoPrice(event.target.value)}
                        step="0.01"
                        type="number"
                        value={demoPrice}
                      />
                    </label>
                    <p className="mt-2 text-[11px] text-violet-100/80">
                      Crea un asset locale simulato senza usare il nodo. Poi
                      puoi acquistare l’inserzione dal Marketplace con il saldo
                      demo-USDT.
                    </p>
                  </div>
                )}
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
                      Metadata JSON copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Export RGB-21 metadata (JSON)
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
                      {demoModeEnabled
                        ? 'Crea licenza demo e pubblica…'
                        : 'Firma, crea UDA e pubblica…'}
                    </>
                  ) : publishedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      License published to marketplace! Bozza demo salvata (non
                      pubblicata)
                    </>
                  ) : (
                    <>
                      Prefill & publish listing Salva bozza demo non pubblicata
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
