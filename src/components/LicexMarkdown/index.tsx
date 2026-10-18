import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

interface LicexMarkdownProps {
  content: string
  className?: string
}

export const licexMarkdownComponents: Components = {
  a: ({ node: _node, ...p }) => (
    <a
      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors"
      rel="noreferrer"
      target="_blank"
      {...p}
    />
  ),
  blockquote: ({ node: _node, ...p }) => (
    <blockquote
      className="my-3 border-l-4 border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 rounded-r-lg"
      {...p}
    />
  ),
  code: ({ node: _node, ...p }) => (
    <code
      className="break-all rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300 border border-slate-700/50"
      {...p}
    />
  ),
  em: ({ node: _node, ...p }) => (
    <em className="italic text-slate-300" {...p} />
  ),
  h1: ({ node: _node, ...p }) => (
    <h1 className="mb-2 text-base font-bold text-white tracking-tight" {...p} />
  ),
  h2: ({ node: _node, ...p }) => (
    <h2 className="mb-2 text-sm font-bold text-white tracking-tight" {...p} />
  ),
  h3: ({ node: _node, ...p }) => (
    <h3
      className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200"
      {...p}
    />
  ),
  li: ({ node: _node, ...p }) => (
    <li className="leading-relaxed text-slate-300 pl-1" {...p} />
  ),
  ol: ({ node: _node, ...p }) => (
    <ol
      className="mb-3 list-decimal space-y-1.5 pl-5 text-slate-300 last:mb-0"
      {...p}
    />
  ),
  p: ({ node: _node, ...p }) => (
    <p className="mb-2.5 leading-relaxed text-slate-300 last:mb-0" {...p} />
  ),
  strong: ({ node: _node, ...p }) => (
    <strong className="font-semibold text-white" {...p} />
  ),
  ul: ({ node: _node, ...p }) => (
    <ul
      className="mb-3 list-disc space-y-1.5 pl-5 text-slate-300 last:mb-0"
      {...p}
    />
  ),
}

export const LicexMarkdown: React.FC<LicexMarkdownProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null

  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        components={licexMarkdownComponents}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Strips markdown symbols for short single/double line previews (grid cards, list rows).
 */
export function cleanMarkdownForPreview(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
    .replace(/\*(.*?)\*/g, '$1') // remove italic
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^>\s*/gm, '') // remove blockquote markers
    .replace(/^[-*•]\s+/gm, '') // remove bullet points
    .replace(/^[#]+\s+/gm, '') // remove heading markers
    .replace(/\r?\n+/g, ' ') // collapse multiple lines to single space
    .trim()
}
