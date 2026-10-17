// ─── LICEX AI Assistant Page ──────────────────────────────────────────────────
// Autonomous & interactive license intelligence agent (designed for QVAC local LLM).
// Analyzes license terms, transferability, vendor reputation, and drafts terms.

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Cpu, Lightbulb } from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { addChatMessage, setChatLoading } from '../../slices/licex/licex.slice'
import type { ChatMessage } from '../../types/licex'

const SUGGESTED_PROMPTS = [
  'Quali licenze di sviluppo consentono il resale illimitato senza approvazione?',
  'Analizza la differenza tra royalty standard e transfer approvato dalla software house.',
  'Come funziona la revoca della chiave vecchia durante il transfer di un token RGB?',
  'Mostrami le migliori licenze per Cybersecurity sotto i 100.000 sats.',
]

export function Component() {
  const dispatch = useAppDispatch()
  const { chatMessages, chatLoading, listings } = useAppSelector((s) => s.licex)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, chatLoading])

  const handleSend = (textToSend?: string) => {
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

    // Simulated QVAC Local AI Response
    setTimeout(() => {
      const lower = text.toLowerCase()
      let reply: string

      if (
        lower.includes('resale') ||
        lower.includes('transfer') ||
        lower.includes('trasferibil')
      ) {
        reply =
          '**Analisi Politiche di Trasferimento LICEX (Layer 1 + 2):**\n\n' +
          '• **Freely Transferable**: Il token RGB su Bitcoin può essere scambiato atomicamente su LicEX Marketplace o via swap RGB peer-to-peer. Al termine del transfer, il server di autenticazione del vendor valida il consignment RGB, invalida la chiave precedente e rilascia un nuovo token JWT o licenza hardware-bound.\n' +
          "• **Transferable with Approval**: Richiede firma crittografica bilaterale prima del broadcast. Consente ai vendor enterprise di verificare la compliance dell'acquirente.\n" +
          '• **Royalty on Resale**: Il venditore imposta una percentuale (es. 5-10%) che viene pagata automaticamente al mint creator in satoshi.'
      } else if (
        lower.includes('cybersecurity') ||
        lower.includes('sicurezza')
      ) {
        const secListings = listings.filter((l) => l.category === 'Security')
        reply =
          `Ho trovato **${secListings.length} licenze attive** nella categoria Security:\n\n` +
          secListings
            .map(
              (l) =>
                `• **${l.productName}** (${l.edition}) - ${l.price.toLocaleString()} sats (${l.transferPolicy === 'transferable_free' ? 'Trasferimento libero' : 'Approvazione richiesta'})`
            )
            .join('\n') +
          '\n\nVuoi che verifichi lo stato delle chiavi crittografiche o i vincoli di piattaforma?'
      } else if (
        lower.includes('revoca') ||
        lower.includes('chiave') ||
        lower.includes('attivazione')
      ) {
        reply =
          '**Meccanismo di Attivazione e Revoca Sicura (Layer 3):**\n\n' +
          '1. Quando un token RGB20/RGB25 cambia proprietario, il nuovo UTXO su Bitcoin fa da *single-use-seal*.\n' +
          '2. Il protocollo LICEX genera una prova di possesso (proof of ownership) firmata con la chiave del nuovo proprietario.\n' +
          "3. Il software client effettua un ping all'endpoint di validazione: la sessione precedente viene terminata e la licenza viene riattivata sul nuovo device."
      } else {
        reply =
          `Ho elaborato la tua richiesta: "${text}".\n\n` +
          'Nel contesto di LICEX su Bitcoin Mutinynet, ogni licenza unisce i diritti digitali proprietari garantiti da RGB con la logica decentralizzata di scambio. Posso assisterti nel verificare il fair value di mercato, generare policy di licenza per publisher o calcolare le stime dei costi in sats.'
      }

      const botMsg: ChatMessage = {
        content: reply,
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      }

      dispatch(addChatMessage(botMsg))
      dispatch(setChatLoading(false))
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
              {msg.content}
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
              <span>Analyzing RGB protocol metadata & contract clauses...</span>
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
    </div>
  )
}

Component.displayName = 'LicexAssistantPage'
