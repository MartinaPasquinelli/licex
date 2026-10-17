// ─── LICEX Wishlist / Wanted Software Page ──────────────────────────────────
// Allows users to request software licenses that aren't yet on LICEX,
// pledge interest or sats, and for companies to discover demand.

import React, { useState } from 'react'
import {
  Sparkles,
  Plus,
  ThumbsUp,
  Coins,
  Search,
  Building,
  X,
} from 'lucide-react'

import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { addWishlistItem } from '../../slices/licex/licex.slice'

function formatSats(sats: number): string {
  if (sats === 0) return '0 sats'
  if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
  if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K sats`
  return `${sats.toLocaleString()} sats`
}

export function Component() {
  const dispatch = useAppDispatch()
  const { wishlist } = useAppSelector((s) => s.licex)

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [useCase, setUseCase] = useState('')
  const [description, setDescription] = useState('')
  const [targetBudget, setTargetBudget] = useState('')

  const filteredRequests = wishlist.filter((item) => {
    return (
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.useCase.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) return

    dispatch(
      addWishlistItem({
        budget: targetBudget ? parseInt(targetBudget, 10) : null,
        consentToAggregation: true,
        description,
        platforms: ['macOS', 'Linux', 'Windows'],
        requirements: ['Perpetual or transferable license'],
        title,
        useCase: useCase || 'Individual developer license',
      })
    )

    setTitle('')
    setUseCase('')
    setDescription('')
    setTargetBudget('')
    setShowModal(false)
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
            Request Software
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
                    <p className="text-xs text-[rgb(var(--app-content-secondary))] flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-cyan-400" />
                      Use Case:{' '}
                      <span className="font-medium text-[rgb(var(--app-content-primary))]">
                        {item.useCase}
                      </span>
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === 'matched'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : item.status === 'fulfilled'
                          ? 'bg-[#8FB8DE]/15 text-[#CDF7F6] border border-[#8FB8DE]/30'
                          : 'bg-[#9B5094]/15 text-[#CDF7F6] border border-[#9B5094]/30'
                    }`}
                  >
                    {item.status === 'matched'
                      ? 'Publisher Matched'
                      : item.status === 'fulfilled'
                        ? 'Available in Catalog'
                        : 'Open Request'}
                  </span>
                </div>

                <p className="text-xs text-[rgb(var(--app-content-secondary))] leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {item.platforms.map((plat) => (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))]"
                      key={plat}
                    >
                      {plat}
                    </span>
                  ))}
                </div>
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
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Request Software License
                </h2>
                <button
                  className="text-[rgb(var(--app-content-secondary))] hover:text-white"
                  onClick={() => setShowModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Software / Product Name *
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. JetBrains IntelliJ IDEA Ultimate"
                    required
                    type="text"
                    value={title}
                  />
                </div>

                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Use Case / Edition *
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setUseCase(e.target.value)}
                    placeholder="e.g. Full-stack Rust & Python development"
                    required
                    type="text"
                    value={useCase}
                  />
                </div>

                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Target Fair Price (sats)
                  </label>
                  <input
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setTargetBudget(e.target.value)}
                    placeholder="e.g. 150000"
                    type="number"
                    value={targetBudget}
                  />
                </div>

                <div>
                  <label className="text-xs text-[rgb(var(--app-content-secondary))] block mb-1">
                    Why is an RGB transferable license needed? *
                  </label>
                  <textarea
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-[rgb(var(--app-surface-primary))] border border-[rgb(var(--app-border-primary))]/30 text-white focus:outline-none focus:border-purple-500"
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why would an RGB transferable license be valuable for this product? Explain editions or terms needed."
                    required
                    rows={3}
                    value={description}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    className="flex-1 py-2.5 rounded-xl text-sm bg-[rgb(var(--app-surface-primary))] text-[rgb(var(--app-content-secondary))] border border-[rgb(var(--app-border-primary))]/30 hover:text-white"
                    onClick={() => setShowModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                    type="submit"
                  >
                    Submit Demand Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

Component.displayName = 'LicexWishlistPage'
