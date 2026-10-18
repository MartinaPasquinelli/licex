// ─── QVAC EULA Analyzer Interactive Tab ──────────────────────────────────────
// High-impact UI for uploading, pasting, and analyzing license agreements.
// Implements US-05 (Structured extraction) and US-06 (Compliance audit).

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
} from 'lucide-react'

import { useAppDispatch } from '../../app/store/hooks'
import { addListing } from '../../slices/licex/licex.slice'
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
import type { TransferPolicy, LicenseListing } from '../../types/licex'
import { LicexMarkdown } from '../../components/LicexMarkdown'
import { useMind } from '../../hooks/useMind'
import { KALEIDO_MIND_MODELS_PATH } from '../../app/router/paths'
import { isUsableQvacStatus } from '../../services/qvac/licex-assistant'
import { getRecommendedModelId } from '../kaleido-mind/modelCatalog'

export function EulaAnalyzerTab() {
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

  const handleSaveDraft = () => {
    if (!analysisResult) return

    const { extracted, executiveSummary } = analysisResult

    const newListing: LicenseListing = {
      category: 'Software & Tools',
      company: {
        companyStatus: 'pending',
        defaultRoyaltyPercent: 0,
        defaultTransferPolicy: 'not_transferable',
        description: 'Bozza demo: dati aziendali e licenza non verificati.',
        domain: 'non-verificato.invalid',
        id: 'comp-qvac-draft',
        logoUrl: '',
        name: 'Azienda da verificare',
        refundPolicy: 'Da definire',
      },
      companyId: 'comp-qvac-draft',
      createdAt: new Date().toISOString(),
      durationDays: extracted.durationDays,
      edition: extracted.edition || 'Standard',
      id: `lic-${Date.now()}`,
      imageUrl: '',
      licenseType: extracted.licenseType,
      maxTransfers: 0,
      minHoldingDays: null,
      paymentAsset: 'Da configurare',
      platforms: extracted.platforms,
      price: 0,
      productDescription: `${executiveSummary}\n\nBozza demo non verificata. Non pubblicare senza revisione umana e verifica del venditore e dei termini.`,
      productName: extracted.productName,
      royaltyPercent: 0,
      status: 'draft',
      tags: [
        extracted.edition || 'Pro',
        extracted.licenseType,
        ...extracted.platforms,
      ],
      transferPolicy: 'not_transferable',
      updatedAt: new Date().toISOString(),
      version: extracted.version || '1.0',
    }

    dispatch(addListing(newListing))
    setPublishedSuccess(true)
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
                Contratto EULA / Termini
              </label>
              <span className="text-xs text-slate-400">
                {contractText.length} caratteri
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Esempi Reali Precaricati (1-Click Demo):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {EULA_SAMPLES.map((sample) => {
                  const isSelected = selectedSampleId === sample.id
                  return (
                    <button
                      className={`text-left p-2.5 rounded-lg text-xs transition border flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                      }`}
                      key={sample.id}
                      onClick={() => handleSelectSample(sample.id)}
                      type="button"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {sample.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sample.subtitle}
                        </div>
                      </div>
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
                    </button>
                  )
                })}
              </div>
            </div>

            {/* EULA Text Area */}
            <div>
              <textarea
                className="w-full font-mono text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed"
                onChange={(e) => {
                  setContractText(e.target.value)
                  setSelectedSampleId('')
                  setAnalysisResult(null)
                  setAiReview(null)
                  setAnalysisError('')
                }}
                placeholder="Incolla qui il testo del contratto di licenza o EULA..."
                rows={10}
                value={contractText}
              />
            </div>

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
                Confronto euristico con la dichiarazione del venditore. Non
                verifica la conformità legale:
              </p>
              <select
                className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                onChange={(e) => {
                  setClaimedPolicy(e.target.value as TransferPolicy | '')
                  setAnalysisResult(null)
                  setAiReview(null)
                }}
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
                  Analisi del modello locale…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analizza con QVAC locale
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
                        Ipotesi euristica: trasferimento libero
                      </div>
                    )}
                    {analysisResult.extracted.transferPolicy ===
                      'transferable_with_approval' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        Ipotesi euristica: possibile approvazione (
                        {analysisResult.extracted.royaltyEstimatePercent ?? 5}%)
                      </div>
                    )}
                    {analysisResult.extracted.transferPolicy ===
                      'not_transferable' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                        <XCircle className="w-4 h-4" />
                        Nessun segnale di trasferibilità nelle regole
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
                        Disaccordo rilevato dalle regole (non verifica legale)
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
                    Sintesi euristica (regole, non AI)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    Riepilogo non verificato
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <LicexMarkdown content={analysisResult.executiveSummary} />
                </div>
              </div>

              {/* Grounded Legal Clauses (With Exact Text Quotes) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Clausole Rilevate con Citazione del Testo Originale
                  </h3>
                  <span className="text-xs text-slate-400">
                    {analysisResult.clauses.length} clausole analizzate
                  </span>
                </div>

                <div className="space-y-2.5">
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
              </div>

              {/* Action Bar (Export JSON and save a non-published draft) */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
                  disabled={publishedSuccess}
                  onClick={handleSaveDraft}
                  type="button"
                >
                  {publishedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Bozza demo salvata (non pubblicata)
                    </>
                  ) : (
                    <>
                      Salva bozza demo non pubblicata
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
