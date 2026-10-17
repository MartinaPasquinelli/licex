// ─── LICEX AI Assistant Page ──────────────────────────────────────────────────
// Autonomous & interactive license intelligence agent (designed for QVAC local LLM).
// Analyzes license terms, transferability, vendor reputation, and drafts terms.

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  FileSearch,
  MessageSquare,
  Play,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { addChatMessage, setChatLoading } from '../../slices/licex/licex.slice'
import type { ChatMessage } from '../../types/licex'
import { EulaAnalyzerTab } from './EulaAnalyzerTab'
import { LicexMarkdown } from '../../components/LicexMarkdown'
import { useMind } from '../../hooks/useMind'
import {
  KALEIDO_MIND_PATH,
  LICEX_MARKETPLACE_PATH,
} from '../../app/router/paths'
import {
  getTransferPolicyLabel,
  isCatalogSearchQuery,
  searchLicexCatalog,
} from '../../services/qvac/licex-catalog-search'
import {
  buildLicexAssistantPrompt,
  isUsableQvacStatus,
  parseGroundedAssistantReply,
} from '../../services/qvac/licex-assistant'
import { getRecommendedModelId } from '../kaleido-mind/modelCatalog'
import { LAST_MODEL_KEY } from '../kaleido-mind/start-brain-modal'

const SUGGESTED_PROMPTS = [
  'Sono freelance: cerco software di modellazione 3D per Linux, rivendibile, sotto 50.000 sats.',
  'Analizza la differenza tra royalty standard e transfer approvato dalla software house.',
  'Come funziona la revoca della chiave vecchia durante il transfer di un token RGB?',
  'Mostrami licenze di cybersecurity sotto i 100.000 sats.',
]

function describeSearchCriteria(
  criteria: ReturnType<typeof searchLicexCatalog>['criteria']
): string {
  const filters: string[] = []
  if (criteria.productQuery)
    filters.push(`prodotto/brand ${criteria.productQuery}`)
  if (criteria.topic === '3d') filters.push('modellazione 3D/CAD')
  else if (criteria.topic) filters.push(criteria.topic)
  if (criteria.platforms.length > 0)
    filters.push(criteria.platforms.join(' e '))
  if (criteria.budgetMax !== null) {
    filters.push(
      `prezzo massimo di ${criteria.budgetMax.toLocaleString()} sats`
    )
  }
  if (criteria.requiresFreeTransfer) {
    filters.push('trasferimento libero')
  } else if (criteria.requiresTransferability) {
    filters.push('possibilità di rivendita')
  }

  return filters.length > 0 ? filters.join(', ') : 'nessun filtro specifico'
}

export function Component() {
  const dispatch = useAppDispatch()
  const { chatMessages, chatLoading, listings } = useAppSelector((s) => s.licex)
  const mind = useMind()
  const qvacReady = isUsableQvacStatus(mind.status)

  const [activeTab, setActiveTab] = useState<'eula' | 'chat'>('eula')
  const [input, setInput] = useState('')
  const [startError, setStartError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationId = useRef<string | null>(null)
  const { refresh } = mind
  const recommendedModelId = getRecommendedModelId(mind.catalog, mind.hardware)
  let lastModelId: string | null = null
  try {
    lastModelId = localStorage.getItem(LAST_MODEL_KEY)
  } catch {
    // Storage may be unavailable in restricted webview contexts.
  }
  const modelToStart =
    (lastModelId && mind.installed.some((model) => model.id === lastModelId)
      ? lastModelId
      : (mind.installed.find((model) => model.id === recommendedModelId)?.id ??
        mind.installed[0]?.id)) ?? ''

  useEffect(() => {
    void refresh()
  }, [refresh])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, chatLoading])

  const handleStartModel = async () => {
    if (!modelToStart || mind.starting) return
    setStartError('')
    try {
      localStorage.setItem(LAST_MODEL_KEY, modelToStart)
    } catch {
      // Starting the model does not depend on persisting the last selection.
    }
    try {
      await mind.startProvider(modelToStart)
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : 'Errore durante l’avvio del modello.'
      )
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || chatLoading) return

    const userMsg: ChatMessage = {
      content: text.trim(),
      id: `msg-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
    }

    dispatch(addChatMessage(userMsg))
    if (!textToSend) setInput('')
    dispatch(setChatLoading(true))

    let reply: string
    let listingIds: string[] | undefined
    try {
      if (isCatalogSearchQuery(text)) {
        const searchResult = searchLicexCatalog(text.trim(), listings)
        const criteriaDescription = describeSearchCriteria(
          searchResult.criteria
        )

        if (searchResult.listings.length > 0) {
          reply = `Ho trovato ${searchResult.listings.length === 1 ? 'una licenza' : `${searchResult.listings.length} licenze`} compatibili con **${criteriaDescription}**.`
          listingIds = searchResult.listings.map((listing) => listing.id)
        } else {
          const underBudgetButNotResellable = searchResult.nearMatches.find(
            ({ unmetRequirements }) =>
              unmetRequirements.length === 1 &&
              unmetRequirements[0] === 'transferability'
          )
          const resellableButOverBudget = searchResult.nearMatches.find(
            ({ unmetRequirements }) =>
              unmetRequirements.length === 1 &&
              unmetRequirements[0] === 'budget'
          )
          const alternatives = [
            underBudgetButNotResellable,
            resellableButOverBudget,
            ...searchResult.nearMatches,
          ]
            .filter(
              (
                match,
                index,
                matches
              ): match is (typeof searchResult.nearMatches)[number] =>
                match !== undefined &&
                matches.findIndex(
                  (candidate) => candidate?.listing.id === match.listing.id
                ) === index
            )
            .slice(0, 2)
          const excludedListings = searchResult.nearMatches
            .filter(({ listing }) =>
              alternatives.some(
                (alternative) => alternative.listing.id === listing.id
              )
            )
            .map(({ listing, unmetRequirements }) => {
              const reasons = unmetRequirements.map((requirement) => {
                if (requirement === 'budget') {
                  return `costa ${listing.price.toLocaleString()} sats, oltre il budget`
                }
                return listing.transferPolicy === 'not_transferable'
                  ? 'non è rivendibile'
                  : 'richiede approvazione per la rivendita'
              })

              return `- **${listing.productName}**: ${reasons.join(' e ')}.`
            })
          reply =
            `Non trovo licenze che rispettino **${criteriaDescription}**.` +
            (excludedListings.length > 0
              ? `\n\nPiù vicine, ma non compatibili:\n${excludedListings.join('\n')}`
              : '')
          listingIds = alternatives.map(({ listing }) => listing.id)
        }
      } else if (qvacReady) {
        conversationId.current ??= crypto.randomUUID()
        const modelReply = await mind.chat(
          buildLicexAssistantPrompt(text.trim(), chatMessages, listings),
          undefined,
          conversationId.current
        )
        const groundedReply = parseGroundedAssistantReply(
          modelReply.text,
          listings
        )
        reply = groundedReply.answer
        listingIds = groundedReply.listingIds
      } else {
        reply =
          mind.status?.inferenceDevice === 'mock'
            ? 'QVAC è in Mock mode: le risposte non sono generate da un modello. Premi **Avvia modello locale** qui sopra per attivare un modello installato.'
            : mind.installed.length > 0
              ? 'Per rispondere a domande aperte avvia il modello locale con il pulsante qui sopra. Intanto posso cercare corrispondenze esplicite nel catalogo.'
              : 'Non risulta installato un modello locale. Installa un modello QVAC per abilitare le risposte a domande aperte; intanto posso cercare corrispondenze esplicite nel catalogo.'
      }
    } catch (error) {
      reply =
        `Non sono riuscito a ottenere una risposta dal modello QVAC: ${error instanceof Error ? error.message : String(error)}. ` +
        'La risposta non è stata sostituita con una risposta generica.'
    } finally {
      dispatch(setChatLoading(false))
    }

    const botMsg: ChatMessage = {
      content: reply,
      id: `msg-${Date.now() + 1}`,
      listingIds,
      role: 'assistant',
      timestamp: new Date().toISOString(),
    }
    dispatch(addChatMessage(botMsg))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[rgb(var(--app-border-primary))]/20 bg-[rgb(var(--app-surface-secondary))]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[rgb(var(--app-surface-secondary))] rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[rgb(var(--app-content-primary))]">
                  LICEX Assistant
                </h1>
                <span
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    qvacReady
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : mind.status?.inferenceDevice === 'mock'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      qvacReady
                        ? 'bg-emerald-400 animate-pulse'
                        : mind.status?.inferenceDevice === 'mock'
                          ? 'bg-rose-300'
                          : 'bg-amber-300'
                    }`}
                  />
                  {qvacReady
                    ? `QVAC · ${mind.status?.activeModelName ?? 'attivo'}`
                    : mind.status?.inferenceDevice === 'mock'
                      ? 'Mock mode · risposte simulate'
                      : 'Ricerca locale · QVAC spento'}
                </span>
              </div>
              <p className="text-xs text-[rgb(var(--app-content-secondary))]">
                Local AI for software license legal compliance, pricing
                discovery & transfer policy analysis
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'eula'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('eula')}
              type="button"
            >
              <FileSearch className="w-3.5 h-3.5" />
              Analizzatore EULA (QVAC)
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('chat')}
              type="button"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat Assistente
            </button>
          </div>
        </div>
      </div>

      {!qvacReady && (
        <div
          className={`flex flex-shrink-0 items-center justify-between gap-4 border-b px-6 py-2.5 text-xs ${
            mind.status?.inferenceDevice === 'mock'
              ? 'border-rose-500/20 bg-rose-500/5 text-rose-200'
              : 'border-amber-500/20 bg-amber-500/5 text-amber-200'
          }`}
          role="status"
        >
          <div className="min-w-0">
            <p>
              {mind.starting || mind.loading
                ? `Avvio del modello locale${mind.loading?.percentage != null ? ` · ${mind.loading.percentage}%` : ''}${mind.loading?.message ? ` — ${mind.loading.message}` : '…'}`
                : mind.status?.inferenceDevice === 'mock'
                  ? 'QVAC è in Mock mode: avvia il modello locale per usare risposte reali.'
                  : 'Il modello locale è spento: puoi avviarlo qui senza aprire KaleidoMind.'}
            </p>
            {startError && (
              <p className="mt-1 text-rose-300" role="alert">
                Avvio non riuscito: {startError}
              </p>
            )}
            {!mind.catalogLoading &&
              mind.installed.length === 0 &&
              mind.catalogError && (
                <p className="mt-1 text-rose-300" role="alert">
                  Impossibile caricare i modelli: {mind.catalogError}
                </p>
              )}
          </div>
          {mind.installed.length > 0 ? (
            <button
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-semibold text-emerald-200 hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60"
              disabled={!modelToStart || mind.starting || !!mind.loading}
              onClick={() => void handleStartModel()}
              type="button"
            >
              <Play className="h-3.5 w-3.5" />
              {mind.starting || mind.loading
                ? 'Avvio…'
                : `Avvia ${mind.installed.find((model) => model.id === modelToStart)?.displayName ?? 'modello locale'}`}
            </button>
          ) : (
            <Link
              className="flex-shrink-0 font-semibold underline underline-offset-2 hover:text-white"
              to={KALEIDO_MIND_PATH}
            >
              {mind.catalogLoading
                ? 'Caricamento modelli…'
                : 'Nessun modello installato'}
            </Link>
          )}
        </div>
      )}

      {/* Body Content based on activeTab */}
      {activeTab === 'eula' ? (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <EulaAnalyzerTab />
        </div>
      ) : (
        <>
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {chatMessages.map((msg) => (
              <div
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
                key={msg.id}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[rgb(var(--app-surface-secondary))] border border-purple-500/30 text-purple-400'
                  }`}
                >
                  {msg.role === 'user' ? 'ME' : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'bg-[rgb(var(--app-surface-secondary))] border border-[rgb(var(--app-border-primary))]/30 text-[rgb(var(--app-content-primary))]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <>
                      <LicexMarkdown content={msg.content} />
                      {msg.listingIds && msg.listingIds.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.listingIds
                            .map((listingId) =>
                              listings.find(
                                (listing) => listing.id === listingId
                              )
                            )
                            .filter((listing) => listing !== undefined)
                            .map((listing) => (
                              <Link
                                className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-slate-950/50 px-3 py-2.5 transition-colors hover:border-purple-400/50"
                                key={listing.id}
                                to={`${LICEX_MARKETPLACE_PATH}/${listing.id}`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-white">
                                    {listing.productName}
                                  </span>
                                  <span className="block text-xs text-slate-400">
                                    {listing.price.toLocaleString()} sats ·{' '}
                                    {listing.platforms.join(', ')} ·{' '}
                                    {getTransferPolicyLabel(
                                      listing.transferPolicy
                                    )}
                                  </span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-purple-300" />
                              </Link>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                  <div
                    className={`text-[10px] mt-2 opacity-60 text-right ${
                      msg.role === 'user'
                        ? 'text-purple-200'
                        : 'text-[rgb(var(--app-content-secondary))]'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-3 max-w-xl animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[rgb(var(--app-surface-secondary))] border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-[rgb(var(--app-surface-secondary))] border border-[rgb(var(--app-border-primary))]/30 text-xs text-[rgb(var(--app-content-secondary))] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>
                    Analyzing RGB protocol metadata & contract clauses...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          {chatMessages.length <= 3 && (
            <div className="px-6 py-2 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  className="text-xs px-3 py-1.5 rounded-full bg-[rgb(var(--app-surface-secondary))] text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/30 hover:border-purple-500/40 hover:text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                >
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex-shrink-0 p-4 border-t border-[rgb(var(--app-border-primary))]/20 bg-[rgb(var(--app-surface-secondary))]/30">
            <form
              className="max-w-4xl mx-auto flex items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
            >
              <div className="flex-1 relative">
                <input
                  className="w-full px-4 py-3 rounded-xl text-sm
                    bg-[rgb(var(--app-surface-secondary))]
                    border border-[rgb(var(--app-border-primary))]/30
                    text-[rgb(var(--app-content-primary))]
                    placeholder-[rgb(var(--app-content-secondary))]/50
                    focus:border-purple-500/50 focus:outline-none"
                  disabled={chatLoading}
                  id="licex-chat-input"
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Chiedi a QVAC chiarimenti sui termini di licenza o sulle regole di mercato..."
                  type="text"
                  value={input}
                />
              </div>

              <button
                className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                disabled={!input.trim() || chatLoading}
                id="licex-chat-send-btn"
                type="submit"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

Component.displayName = 'LicexAssistantPage'
