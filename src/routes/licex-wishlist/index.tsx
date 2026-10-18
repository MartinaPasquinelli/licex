// ─── LICEX Wishlist / Wanted Software Page ──────────────────────────────────
// Allows users to request software licenses that aren't yet on LICEX,
// pledge interest or sats, and for companies to discover demand.

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Sparkles,
  Plus,
  ThumbsUp,
  Coins,
  Search,
  X,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  addWishlistGroup,
  addWishlistItem,
  setWishlist,
} from '../../slices/licex/licex.slice'
import { loadWishlistFromSqlite } from '../../services/licex/licexStorage'
import { useGetBitcoinPriceQuery } from '../../slices/priceApi/priceApi.slice'
import { useMind } from '../../hooks/useMind'
import { isUsableQvacStatus } from '../../services/qvac/licex-assistant'
import {
  buildWishlistRfpPrompt,
  createWishlistRfp,
  parseWishlistRfpResponse,
  sanitizeRfpFields,
  type WishlistRfp,
} from '../../services/qvac/wishlist-sanitizer'
import {
  buildWishlistGroupingPrompt,
  findWishlistMatches,
  parseWishlistGroupingResponse,
} from '../../services/qvac/wishlist-grouping'
import type { WantedSoftwareRequest } from '../../types/licex'

function formatSats(sats: number): string {
  if (sats === 0) return '0 sats'
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K sats`
  return `${sats.toLocaleString()} sats`
}

export function Component() {
  const dispatch = useAppDispatch()
  const { wishlist, wishlistGroups } = useAppSelector((s) => s.licex)
  const mind = useMind()
  const { data: bitcoinPriceData } = useGetBitcoinPriceQuery('usd')
  const btcUsdPrice = bitcoinPriceData?.bitcoin.usd

  useEffect(() => {
    loadWishlistFromSqlite().then((items) => {
      if (items && items.length > 0) dispatch(setWishlist(items))
    })
  }, [dispatch])

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [rawRequest, setRawRequest] = useState('')
  const [rfpPreview, setRfpPreview] = useState<WishlistRfp | null>(null)
  const [consentToAggregation, setConsentToAggregation] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisNotice, setAnalysisNotice] = useState('')
  const [groupingNotice, setGroupingNotice] = useState('')

  const filteredRequests = wishlist.filter((item) => {
    return (
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.useCase.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handlePrepareRfp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawRequest.trim() || isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisNotice('')
    let rfp = createWishlistRfp(rawRequest, btcUsdPrice)

    if (isUsableQvacStatus(mind.status)) {
      try {
        const response = await mind.chat(
          buildWishlistRfpPrompt(rawRequest.trim()),
          undefined,
          `wishlist-rfp-${crypto.randomUUID()}`
        )
        rfp = parseWishlistRfpResponse(response.text, rfp)
        setAnalysisNotice(
          rfp.sanitizationSource === 'local-model'
            ? 'Testo analizzato e anonimizzato dal modello AI locale. Controlla comunque l’anteprima prima di pubblicare.'
            : 'La risposta del modello non ha superato i controlli privacy: anteprima preparata con regole automatiche. Verifica attentamente il testo prima di pubblicarlo.'
        )
      } catch (error) {
        setAnalysisNotice(
          `Analisi AI locale non disponibile: ${error instanceof Error ? error.message : String(error)}. Ho preparato l’anteprima con regole automatiche; verifica attentamente il testo prima di pubblicarlo.`
        )
      }
    } else {
      setAnalysisNotice(
        'Modello AI locale non attivo: la bozza è stata preparata con regole automatiche, che possono non riconoscere ogni dato identificativo. Verifica attentamente il testo prima di pubblicarlo.'
      )
    }

    setRfpPreview(rfp)
    setConsentToAggregation(false)
    setIsAnalyzing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rfpPreview || isAnalyzing) return

    const safeFields = sanitizeRfpFields({
      description: rfpPreview.publicDescription,
      title: rfpPreview.title,
      useCase: rfpPreview.useCase,
    })
    const now = new Date().toISOString()
    const requestId = `wish-${crypto.randomUUID()}`
    const newRequest: WantedSoftwareRequest = {
      budget: rfpPreview.budgetSats,
      budgetFiat: rfpPreview.budgetFiat,
      category: rfpPreview.category,
      consentToAggregation,
      createdAt: now,
      description: safeFields.description,
      id: requestId,
      matchCount: 0,
      platforms: rfpPreview.platforms,
      pledgeTotal: 0,
      requirements: rfpPreview.requirements,
      status: 'submitted',
      title: safeFields.title,
      updatedAt: now,
      useCase: safeFields.useCase,
    }
    const existingRequests = consentToAggregation
      ? wishlist
          .filter(
            (request) =>
              request.consentToAggregation &&
              request.status !== 'fulfilled' &&
              request.status !== 'expired'
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 30)
      : []

    setIsAnalyzing(true)
    setGroupingNotice('')
    let grouping = findWishlistMatches(newRequest, existingRequests)
    let groupingError: string | null = null
    if (isUsableQvacStatus(mind.status) && existingRequests.length > 0) {
      try {
        const response = await mind.chat(
          buildWishlistGroupingPrompt(newRequest, existingRequests),
          undefined,
          `wishlist-grouping-${crypto.randomUUID()}`
        )
        grouping = parseWishlistGroupingResponse(
          response.text,
          existingRequests,
          newRequest
        )
      } catch (error) {
        groupingError = error instanceof Error ? error.message : String(error)
      }
    } else if (!consentToAggregation) {
      setGroupingNotice(
        'Richiesta pubblicata senza consenso all’aggregazione: non è stata aggiunta a un gruppo per publisher.'
      )
    } else if (existingRequests.length > 0) {
      setGroupingNotice(
        'Modello locale non attivo: le richieste sono state confrontate con regole lessicali locali.'
      )
    }

    dispatch(
      addWishlistItem({
        budget: newRequest.budget,
        budgetFiat: newRequest.budgetFiat,
        category: newRequest.category,
        consentToAggregation: newRequest.consentToAggregation,
        description: safeFields.description,
        id: requestId,
        platforms: newRequest.platforms,
        requirements: newRequest.requirements,
        title: safeFields.title,
        useCase: safeFields.useCase,
      })
    )
    if (grouping.matches.length > 0) {
      const matchedIds = new Set([
        requestId,
        ...grouping.matches.map((match) => match.requestId),
      ])
      const mergedGroupIds = wishlistGroups
        .filter((group) =>
          group.requestIds.some((memberId) => matchedIds.has(memberId))
        )
        .flatMap((group) => group.requestIds)
      const groupSize = new Set([...matchedIds, ...mergedGroupIds]).size
      dispatch(
        addWishlistGroup({
          id: `wish-group-${crypto.randomUUID()}`,
          matches: grouping.matches,
          requestId,
          source: grouping.source,
          summary: grouping.summary,
        })
      )
      setGroupingNotice(
        `Aggiunta a un gruppo di ${groupSize} richieste${grouping.source === 'local-model' ? ' usando il modello locale' : ' usando il confronto locale'}${groupingError ? ` (AI non disponibile: ${groupingError})` : ''}.`
      )
    } else if (existingRequests.length > 0) {
      setGroupingNotice(
        groupingError
          ? `Raggruppamento AI locale non riuscito: ${groupingError}. Non ho trovato corrispondenze con il confronto automatico.`
          : 'Non ho trovato richieste abbastanza simili o complementari da raggruppare.'
      )
    }

    setRawRequest('')
    setRfpPreview(null)
    setConsentToAggregation(false)
    setShowModal(false)
    setIsAnalyzing(false)
  }

  const closeModal = () => {
    setShowModal(false)
    setRfpPreview(null)
    setAnalysisNotice('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--app-content-primary))] flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-amber-400" />
              Software Wishlist & Requests
            </h1>
            <p className="text-sm text-[rgb(var(--app-content-secondary))] mt-1">
              Signal demand for software and tools you want on Bitcoin RGB.
              Companies can verify and mint requested assets.
            </p>
          </div>

          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-purple-600 to-indigo-600 text-white
              hover:from-purple-500 hover:to-indigo-500
              shadow-lg shadow-purple-500/20 transition-all duration-200 self-start md:self-auto"
            id="create-wishlist-request-btn"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4" />
            Request software
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--app-content-secondary))]" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
              bg-[rgb(var(--app-surface-secondary))]
              border border-[rgb(var(--app-border-primary))]/30
              text-[rgb(var(--app-content-primary))]
              placeholder-[rgb(var(--app-content-secondary))]/50
              focus:border-purple-500/50 focus:outline-none"
            id="wishlist-search-input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requested software, vendors, keywords..."
            type="text"
            value={search}
          />
        </div>

        {groupingNotice && (
          <p
            className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-100"
            role="status"
          >
            {groupingNotice}
          </p>
        )}

        {wishlistGroups.length > 0 && (
          <section
            aria-label="Gruppi di richieste per publisher"
            className="space-y-3"
          >
            <div>
              <h2 className="text-base font-semibold text-[rgb(var(--app-content-primary))]">
                Opportunità raggruppate per gli sviluppatori
              </h2>
              <p className="mt-1 text-xs text-[rgb(var(--app-content-secondary))]">
                Raggruppamento locale delle richieste: non le pubblica insieme e
                non modifica il consenso all’aggregazione.
              </p>
            </div>
            {wishlistGroups.map((group) => {
              const groupRequests = group.requestIds
                .map((requestId) =>
                  wishlist.find((request) => request.id === requestId)
                )
                .filter(
                  (request): request is WantedSoftwareRequest =>
                    request !== undefined
                )

              return (
                <article
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
                  key={group.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {group.summary}
                      </h3>
                      <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                        {groupRequests.length} richieste · Rilevato da{' '}
                        {group.source === 'local-model'
                          ? 'modello AI locale'
                          : 'confronto locale automatico'}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200">
                      Nuova opportunità
                    </span>
                  </div>
                  {(group.platforms.length > 0 ||
                    group.combinedRequirements.length > 0) && (
                    <div className="mt-3 rounded-lg border border-cyan-500/10 bg-[rgb(var(--app-surface-primary))]/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                        Ambito di prodotto aggregato
                      </p>
                      {group.platforms.length > 0 && (
                        <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                          Piattaforme: {group.platforms.join(', ')}
                        </p>
                      )}
                      {group.combinedRequirements.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-[rgb(var(--app-content-secondary))]">
                          {group.combinedRequirements.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <ul className="mt-3 space-y-2">
                    {groupRequests.map((request) => {
                      const match = group.matches.find(
                        (candidate) => candidate.requestId === request.id
                      )
                      return (
                        <li
                          className="rounded-lg bg-[rgb(var(--app-surface-primary))]/50 p-3"
                          key={request.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-white">
                              {request.title}
                            </span>
                            {match && (
                              <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] uppercase text-purple-200">
                                {match.relation === 'similar'
                                  ? 'Simile'
                                  : 'Complementare'}
                              </span>
                            )}
                          </div>
                          {match?.reason && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                              {match.reason}
                            </p>
                          )}
                          {request.requirements.length > 0 && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                              Requisiti: {request.requirements.join(' · ')}
                            </p>
                          )}
                          {request.platforms.length > 0 && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                              Piattaforme: {request.platforms.join(', ')}
                            </p>
                          )}
                          {(request.budget != null ||
                            request.budgetFiat != null) && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                              Budget:{' '}
                              {request.budget != null
                                ? formatSats(request.budget)
                                : `$${request.budgetFiat?.toLocaleString('en-US')} USD`}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </article>
              )
            })}
          </section>
        )}

        {/* Wishlist Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((item) => (
            <div
              className="rounded-2xl p-5 flex flex-col justify-between
                bg-gradient-to-br from-[rgb(var(--app-surface-secondary))] to-[rgb(var(--app-surface-primary))]
                border border-[rgb(var(--app-border-primary))]/30 hover:border-purple-500/40
                transition-all duration-200"
              key={item.id}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[rgb(var(--app-content-primary))]">
                      {item.title}
                    </h3>
                    {item.category && (
                      <span className="mt-1 inline-flex rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === 'matched'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : item.status === 'fulfilled'
                          ? 'bg-[#8FB8DE]/15 text-[#CDF7F6] border border-[#8FB8DE]/30'
                          : 'wishlist-open-request bg-[#9B5094]/15 text-[#CDF7F6] border border-[#9B5094]/30'
                    }`}
                  >
                    {item.status === 'matched'
                      ? 'Publisher Matched'
                      : item.status === 'fulfilled'
                        ? 'Available in Catalog'
                        : 'Open Request'}
                  </span>
                </div>

                <div className="rounded-xl border border-[rgb(var(--app-border-primary))]/10 bg-[rgb(var(--app-surface-primary))]/15 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                    Description
                  </p>
                  <p className="text-xs leading-relaxed text-[rgb(var(--app-content-secondary))] line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {(item.requirements.length > 0 ||
                  item.platforms.length > 0) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {item.requirements.length > 0 && (
                      <div className="rounded-xl border border-[rgb(var(--app-border-primary))]/10 bg-[rgb(var(--app-surface-primary))]/15 p-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                          Requirements
                        </p>
                        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[rgb(var(--app-content-secondary))]">
                          {item.requirements.slice(0, 3).map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.platforms.length > 0 && (
                      <div className="rounded-xl border border-[rgb(var(--app-border-primary))]/10 bg-[rgb(var(--app-surface-primary))]/15 p-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                          Platforms
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.platforms.map((plat) => (
                            <span
                              className="rounded bg-[rgb(var(--app-surface-primary))] px-2 py-0.5 text-[10px] text-[rgb(var(--app-content-secondary))]"
                              key={plat}
                            >
                              {plat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer info & pledges */}
              <div className="mt-5 pt-3 border-t border-[rgb(var(--app-border-primary))]/20 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  {item.budget && (
                    <div className="text-[rgb(var(--app-content-secondary))]">
                      Target:{' '}
                      <span className="font-semibold text-[rgb(var(--app-content-primary))]">
                        {formatSats(item.budget)}
                      </span>
                    </div>
                  )}
                  {!item.budget && item.budgetFiat != null && (
                    <div className="text-[rgb(var(--app-content-secondary))]">
                      Indicative budget:{' '}
                      <span className="font-semibold text-[rgb(var(--app-content-primary))]">
                        ${item.budgetFiat.toLocaleString('en-US')} USD
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--app-content-secondary))]">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-amber-400">
                    <Coins className="w-3.5 h-3.5" />
                    <span className="font-bold">
                      {formatSats(item.pledgeTotal)}
                    </span>
                  </div>

                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                      bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20
                      transition-colors"
                    onClick={() =>
                      alert(
                        `Upvoted "${item.title}". Demand signal recorded on-chain demo node.`
                      )
                    }
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{item.matchCount}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: New Software Request */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[rgb(var(--app-surface-secondary))] rounded-2xl p-6 max-w-lg w-full border border-[rgb(var(--app-border-primary))]/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[rgb(var(--app-content-primary))] flex items-center gap-2">
                  {rfpPreview ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  )}
                  {rfpPreview
                    ? 'Review anonymized request'
                    : 'Describe the software you need'}
                </h2>
                <button
                  className="text-[rgb(var(--app-content-secondary))] hover:text-white"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!rfpPreview ? (
                <form className="space-y-4" onSubmit={handlePrepareRfp}>
                  <p className="text-xs leading-relaxed text-[rgb(var(--app-content-secondary))]">
                    Descrivi in modo libero il software che cerchi. Se QVAC è
                    attivo, il testo originale viene analizzato dal runtime QVAC
                    sul dispositivo, senza inviarlo a un modello AI cloud;
                    altrimenti si usa la redazione automatica. Potrai sempre
                    controllare e confermare il testo prima della pubblicazione.
                  </p>
                  <textarea
                    autoFocus
                    className="w-full min-h-36 text-sm px-3.5 py-3 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(event) => setRawRequest(event.target.value)}
                    placeholder="Es. Nel mio studio a Milano usiamo un software CAD che va in crash su Windows 11. Cerco un’alternativa che gestisca file DWG ed esportazione batch; pagherei 500$."
                    required
                    value={rawRequest}
                  />
                  {analysisNotice && (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
                      {analysisNotice}
                    </p>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/30 hover:text-white"
                      onClick={closeModal}
                      type="button"
                    >
                      Annulla
                    </button>
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 disabled:opacity-50"
                      disabled={isAnalyzing}
                      type="submit"
                    >
                      {isAnalyzing
                        ? 'Analisi e anonimizzazione…'
                        : 'Anonimizza e crea anteprima'}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-100">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold">Anteprima anonimizzata</p>
                      <p className="mt-1 text-emerald-100/75">
                        Rivedi i dati: la richiesta viene pubblicata solo dopo
                        la tua conferma.
                        {rfpPreview.redactions.length > 0
                          ? ` Rimossi: ${rfpPreview.redactions.join(', ')}.`
                          : ' Non sono stati rilevati identificativi comuni; verifica comunque il testo.'}
                      </p>
                      {analysisNotice && (
                        <p
                          className={`mt-1 ${
                            rfpPreview.sanitizationSource === 'local-model'
                              ? 'text-emerald-100/75'
                              : 'text-amber-200'
                          }`}
                        >
                          {analysisNotice}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgb(var(--app-border-primary))]/30 bg-[rgb(var(--app-surface-primary))]/60 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                        Categoria
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {rfpPreview.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                        Request
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {rfpPreview.title}
                      </p>
                      <p className="text-xs text-[rgb(var(--app-content-secondary))]">
                        {rfpPreview.useCase}
                      </p>
                    </div>
                    {rfpPreview.platforms.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                          Platforms
                        </p>
                        <p className="text-sm text-white">
                          {rfpPreview.platforms.join(', ')}
                        </p>
                      </div>
                    )}
                    {rfpPreview.requirements.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                          Requirements
                        </p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-white">
                          {rfpPreview.requirements.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                        Descrizione che verrà pubblicata
                      </p>
                      <p className="text-xs leading-relaxed text-white">
                        {rfpPreview.publicDescription}
                      </p>
                    </div>
                    {(rfpPreview.budgetFiat != null ||
                      rfpPreview.budgetSats != null) && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--app-content-secondary))]">
                          Indicative budget
                        </p>
                        <p className="text-sm text-white">
                          {rfpPreview.budgetFiat != null &&
                            `$${rfpPreview.budgetFiat.toLocaleString('en-US')} USD`}
                          {rfpPreview.budgetFiat != null &&
                            rfpPreview.budgetSats != null &&
                            ' ≈ '}
                          {rfpPreview.budgetSats != null &&
                            `${rfpPreview.budgetSats.toLocaleString()} sats`}
                        </p>
                        {rfpPreview.budgetFiat != null &&
                          rfpPreview.budgetSats == null && (
                            <p className="mt-1 text-[10px] text-amber-300">
                              Cambio BTC/USD non disponibile: il budget sarà
                              salvato in USD, non convertito in sats.
                            </p>
                          )}
                        {rfpPreview.budgetFiat != null &&
                          rfpPreview.budgetSats != null &&
                          btcUsdPrice && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--app-content-secondary))]">
                              Stima al tasso BTC/USD corrente (
                              {btcUsdPrice.toLocaleString('en-US')} USD/BTC);
                              non è un impegno né un escrow.
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[rgb(var(--app-border-primary))]/30 p-3 text-xs text-[rgb(var(--app-content-secondary))]">
                    <input
                      checked={consentToAggregation}
                      className="mt-0.5 accent-purple-500"
                      onChange={(event) =>
                        setConsentToAggregation(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      Acconsento che questa richiesta anonimizzata contribuisca
                      all’aggregazione della domanda per i publisher e possa
                      essere abbinata localmente a richieste compatibili. Solo
                      le richieste con questo consenso entrano nei gruppi. La
                      richiesta può essere pubblicata anche senza consenso.
                    </span>
                  </label>

                  <div className="flex gap-3 pt-1">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/30 hover:text-white"
                      onClick={() => setRfpPreview(null)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" /> Modifica testo
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 disabled:opacity-50"
                      disabled={isAnalyzing}
                      type="submit"
                    >
                      <Check className="h-4 w-4" />
                      {isAnalyzing
                        ? 'Raggruppamento richieste…'
                        : 'Pubblica richiesta pulita'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

Component.displayName = 'LicexWishlistPage'
