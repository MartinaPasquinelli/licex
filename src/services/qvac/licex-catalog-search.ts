import type { LicenseListing, TransferPolicy } from '../../types/licex'

export interface CatalogSearchCriteria {
  budgetMax: number | null
  platforms: string[]
  productQuery: string | null
  requiresTransferability: boolean
  requiresFreeTransfer: boolean
  topic: '3d' | 'development' | 'security' | 'design' | null
}

export interface CatalogSearchResult {
  criteria: CatalogSearchCriteria
  listings: LicenseListing[]
  nearMatches: {
    listing: LicenseListing
    unmetRequirements: ('budget' | 'transferability')[]
  }[]
}

export function isCatalogSearchQuery(query: string): boolean {
  const normalizedQuery = normalize(query)
  const criteria = parseCatalogSearchCriteria(query)
  const hasSearchIntent =
    /\b(mostrami|trova|trovarmi|consigliami|consiglia|cerco|sto cercando|mi serve|ho bisogno|vorrei|voglio|comprare|compra|acquistare|acquisto|quali licenze|quale licenza|cosa c['’]e|show me|find|recommend|buy|purchase)\b/.test(
      normalizedQuery
    )
  const hasMultipleSearchConstraints =
    [
      criteria.budgetMax !== null,
      criteria.platforms.length > 0,
      criteria.requiresTransferability,
      criteria.topic !== null,
      criteria.productQuery !== null,
    ].filter(Boolean).length >= 2

  return hasSearchIntent || hasMultipleSearchConstraints
}

const PLATFORM_ALIASES: Record<string, string[]> = {
  Linux: ['linux'],
  Web: ['web', 'browser', 'online'],
  Windows: ['windows', 'win'],
  macOS: ['macos', 'mac os', 'mac'],
}

const TOPIC_TERMS: Record<
  NonNullable<CatalogSearchCriteria['topic']>,
  string[]
> = {
  '3d': [
    '3d',
    '3-d',
    'modellazione',
    'modeling',
    'modelling',
    'cad',
    'blender',
  ],
  design: ['design', 'grafica', 'creative', 'creativo', 'photo', 'video'],
  development: [
    'development',
    'sviluppo',
    'developer',
    'devops',
    'coding',
    'programmazione',
  ],
  security: ['security', 'cybersecurity', 'sicurezza', 'antivirus'],
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseBudget(query: string): number | null {
  const match =
    normalize(query).match(
      /(?:meno di|sotto(?: i)?|under|below|budget(?: massimo)?(?: di)?)\s*(\d[\d.,]*\s*k?|\d[\d.,]*\s*(?:sat(?:s)?|satoshi(?:s)?))/i
    ) ??
    normalize(query).match(/(\d[\d.,]*\s*k?)\s*(?:sat(?:s)?|satoshi(?:s)?)/i)

  if (!match?.[1]) return null

  const rawAmount = match[1].replace(/\s/g, '').toLowerCase()
  const isThousands = rawAmount.endsWith('k')
  const amount = Number(rawAmount.replace(/[.,k]/g, ''))

  return Number.isFinite(amount) ? amount * (isThousands ? 1000 : 1) : null
}

function detectTopic(query: string): CatalogSearchCriteria['topic'] {
  const normalizedQuery = normalize(query)

  if (
    /\b(3d|3-d|cad|blender|modellazione|modeling|modelling)\b/.test(
      normalizedQuery
    )
  ) {
    return '3d'
  }
  if (
    /\b(cybersecurity|security|sicurezza|antivirus)\b/.test(normalizedQuery)
  ) {
    return 'security'
  }
  if (
    /\b(development|sviluppo|developer|devops|coding|programmazione)\b/.test(
      normalizedQuery
    )
  ) {
    return 'development'
  }
  if (
    /\b(design|grafica|creative|creativo|photo|video)\b/.test(normalizedQuery)
  ) {
    return 'design'
  }

  return null
}

function detectProductQuery(query: string): string | null {
  const normalizedQuery = normalize(query)
  const match =
    normalizedQuery.match(
      /\b(?:licenza|licenze|software|prodotto|publisher|vendor)\s+(?:(?:di|del|della|per)\s+)?([a-z0-9][a-z0-9.-]*)/
    ) ??
    normalizedQuery.match(
      /\b(?:rivendere|rivendibile|rivendita\s+di|resell|resale\s+of)\s+(?:la\s+)?([a-z0-9][a-z0-9.-]*)/
    )
  const candidate = match?.[1]

  if (
    !candidate ||
    [
      'di',
      'del',
      'della',
      'per',
      'che',
      'con',
      'sotto',
      'sviluppo',
      'development',
      'sicurezza',
      'security',
      'design',
      'grafica',
      '3d',
      'cad',
      'modellazione',
      'cybersecurity',
      'produttivita',
      'creativo',
      'creative',
    ].includes(candidate)
  ) {
    return null
  }

  return candidate
}

export function parseCatalogSearchCriteria(
  query: string
): CatalogSearchCriteria {
  const normalizedQuery = normalize(query)
  const platforms = Object.entries(PLATFORM_ALIASES)
    .filter(([, aliases]) =>
      aliases.some((alias) =>
        new RegExp(`\\b${alias}\\b`).test(normalizedQuery)
      )
    )
    .map(([platform]) => platform)
  const requiresFreeTransfer =
    /\b(senza approvazione|senza autorizzazione|trasferimento libero|liberamente rivendibile|freely transferable|free resale)\b/.test(
      normalizedQuery
    )
  const requiresTransferability =
    requiresFreeTransfer ||
    /\b(rivend\w*|resale|resell|trasferibil\w*|transferable)\b/.test(
      normalizedQuery
    )

  return {
    budgetMax: parseBudget(query),
    platforms,
    productQuery: detectProductQuery(query),
    requiresFreeTransfer,
    requiresTransferability,
    topic: detectTopic(query),
  }
}

function matchesTopic(
  listing: LicenseListing,
  topic: CatalogSearchCriteria['topic']
): boolean {
  if (!topic) return true
  const searchableText = normalize(
    [
      listing.productName,
      listing.productDescription,
      listing.category,
      ...listing.tags,
    ].join(' ')
  )

  return TOPIC_TERMS[topic].some((term) =>
    searchableText.includes(normalize(term))
  )
}

function matchesProductQuery(
  listing: LicenseListing,
  productQuery: string | null
): boolean {
  if (!productQuery) return true
  const searchableText = normalize(
    [
      listing.productName,
      listing.company.name,
      listing.category,
      ...listing.tags,
    ].join(' ')
  ).replace(/[\s.-]/g, '')

  return searchableText.includes(productQuery.replace(/[\s.-]/g, ''))
}

export function searchLicexCatalog(
  query: string,
  listings: LicenseListing[]
): CatalogSearchResult {
  const criteria = parseCatalogSearchCriteria(query)
  const matchesCoreCriteria = (listing: LicenseListing) => {
    if (listing.status !== 'published') return false
    if (
      !criteria.platforms.every((platform) =>
        listing.platforms.includes(platform)
      )
    ) {
      return false
    }
    if (!matchesProductQuery(listing, criteria.productQuery)) return false

    return matchesTopic(listing, criteria.topic)
  }
  const matchesTransferCriteria = (listing: LicenseListing) =>
    (!criteria.requiresFreeTransfer ||
      listing.transferPolicy === 'transferable_free') &&
    (!criteria.requiresTransferability ||
      criteria.requiresFreeTransfer ||
      listing.transferPolicy !== 'not_transferable')
  const coreMatches = listings.filter(matchesCoreCriteria)
  const results = coreMatches
    .filter(
      (listing) =>
        (criteria.budgetMax === null || listing.price <= criteria.budgetMax) &&
        matchesTransferCriteria(listing)
    )
    .sort((a, b) => a.price - b.price)
  const nearMatches = coreMatches
    .map((listing) => ({
      listing,
      unmetRequirements: [
        ...(criteria.budgetMax !== null && listing.price > criteria.budgetMax
          ? ['budget' as const]
          : []),
        ...(!matchesTransferCriteria(listing)
          ? ['transferability' as const]
          : []),
      ],
    }))
    .filter((match) => match.unmetRequirements.length > 0)
    .sort(
      (a, b) =>
        a.unmetRequirements.length - b.unmetRequirements.length ||
        a.listing.price - b.listing.price
    )

  return { criteria, listings: results, nearMatches }
}

export function getTransferPolicyLabel(policy: TransferPolicy): string {
  switch (policy) {
    case 'not_transferable':
      return 'Non trasferibile'
    case 'transferable_with_approval':
      return 'Trasferibile con approvazione'
    case 'transferable_free':
      return 'Trasferibile liberamente'
  }
}
