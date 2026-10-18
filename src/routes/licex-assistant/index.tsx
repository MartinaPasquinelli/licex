// ─── LICEX AI Assistant Page ──────────────────────────────────────────────────
// Autonomous & interactive license intelligence agent (designed for QVAC local LLM).
// Analyzes license terms, transferability, vendor reputation, and drafts terms.

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Lightbulb, Play, Send, Sparkles } from 'lucide-react'

import { useAppSelector } from '../../app/store/hooks'
import {
  loadLocalChatMessages,
  saveLocalChatMessages,
} from '../../services/licex/licexStorage'
import type { ChatMessage } from '../../types/licex'
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
  const listings = useAppSelector((s) => s.licex.listings)
  const mind = useMind()
  const qvacReady = isUsableQvacStatus(mind.status)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    loadLocalChatMessages
  )
  const [chatLoading, setChatLoading] = useState(false)

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

    const updatedWithUser = [...chatMessages, userMsg]
    setChatMessages(updatedWithUser)
    saveLocalChatMessages(updatedWithUser)
    if (!textToSend) setInput('')
    setChatLoading(true)

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
      setChatLoading(false)
    }

    const botMsg: ChatMessage = {
      content: reply,
      id: `msg-${Date.now() + 1}`,
      listingIds,
      role: 'assistant',
      timestamp: new Date().toISOString(),
    }

    setChatMessages((prev) => [...prev, botMsg])
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 border-b border-[rgb(var(--app-border-primary))]/20 bg-[rgb(var(--app-surface-secondary))]/40 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-[rgb(var(--app-content-primary))]">
              LICEX Assistant
            </h1>
            <p className="text-xs text-[rgb(var(--app-content-secondary))]">
              Ricerca assistita nel catalogo
            </p>
          </div>
        </div>
      </div>

      {!qvacReady && (
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-amber-500/20 bg-amber-500/5 px-6 py-2.5 text-xs text-amber-200">
          <div>
            <p>
              {mind.starting || mind.loading
                ? `Avvio del modello locale${mind.loading?.percentage != null ? ` · ${mind.loading.percentage}%` : ''}…`
                : mind.status?.inferenceDevice === 'mock'
                  ? 'QVAC è in Mock mode: avvia il modello locale per usare risposte reali.'
                  : 'Il modello locale è spento: puoi avviarlo da qui.'}
            </p>
            {startError && (
              <p className="mt-1 text-rose-300" role="alert">
                Avvio non riuscito: {startError}
              </p>
            )}
          </div>
          {mind.installed.length > 0 ? (
            <button
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-semibold text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-60"
              disabled={mind.starting || !!mind.loading || !modelToStart}
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
              Nessun modello installato
            </Link>
          )}
        </div>
      )}

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
                    ? 'bg-[#9B5094] text-white'
                    : 'bg-[rgb(var(--app-surface-secondary))] border border-[#8FB8DE]/30 text-[#CDF7F6]'
                }`}
              >
                {msg.role === 'user' ? 'ME' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#9B5094] to-[#8FB8DE] text-white shadow-md'
                    : 'bg-[rgb(var(--app-surface-secondary))] border border-[rgb(var(--app-border-primary))]/30 text-[rgb(var(--app-content-primary))]'
                }`}
              >
                <LicexMarkdown content={msg.content} />
                {msg.listingIds && msg.listingIds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.listingIds.map((listingId) => {
                      const listing = listings.find(
                        (candidate) => candidate.id === listingId
                      )
                      if (!listing) return null
                      return (
                        <Link
                          className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs hover:bg-purple-500/10"
                          key={listing.id}
                          to={`${LICEX_MARKETPLACE_PATH}/${listing.id}`}
                        >
                          <span>
                            <span className="block font-semibold text-white">
                              {listing.productName}
                            </span>
                            <span className="text-[rgb(var(--app-content-secondary))]">
                              {listing.price.toLocaleString()} sats ·{' '}
                              {getTransferPolicyLabel(listing.transferPolicy)}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-purple-300" />
                        </Link>
                      )
                    })}
                  </div>
                )}
                <div
                  className={`text-[10px] mt-2 opacity-60 text-right ${
                    msg.role === 'user'
                      ? 'text-[#CDF7F6]'
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
              <div className="w-8 h-8 rounded-xl bg-[rgb(var(--app-surface-secondary))] border border-[#8FB8DE]/30 flex items-center justify-center text-[#CDF7F6]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-[rgb(var(--app-surface-secondary))] border border-[rgb(var(--app-border-primary))]/30 text-xs text-[rgb(var(--app-content-secondary))] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#CDF7F6] animate-spin" />
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
                className="text-xs px-3 py-1.5 rounded-full bg-[rgb(var(--app-surface-secondary))] text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/30 hover:border-[#8FB8DE]/40 hover:text-[#CDF7F6] transition-colors flex items-center gap-1.5"
                key={prompt}
                onClick={() => handleSend(prompt)}
              >
                <Lightbulb className="w-3 h-3 text-[#8FB8DE]" />
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
                focus:border-[#8FB8DE]/50 focus:outline-none"
                disabled={chatLoading}
                id="licex-chat-input"
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LICEX Assistant about transfer rules, price discovery, or license terms..."
                type="text"
                value={input}
              />
            </div>

            <button
              className="p-3 rounded-xl bg-gradient-to-r from-[#9B5094] to-[#8FB8DE] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-md shadow-[#9B5094]/20 transition-all"
              disabled={!input.trim() || chatLoading}
              id="licex-chat-send-btn"
              type="submit"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </>
    </div>
  )
}

Component.displayName = 'LicexAssistantPage'
