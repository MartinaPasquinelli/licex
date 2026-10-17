import { describe, expect, it } from 'vitest'

import { MOCK_LISTINGS } from '../../constants/licex-mock-data'
import {
  isCatalogSearchQuery,
  parseCatalogSearchCriteria,
  searchLicexCatalog,
} from './licex-catalog-search'

describe('LICEX natural-language catalog search', () => {
  it('extracts topic, platform, resale intent, and an Italian-formatted sats budget', () => {
    expect(
      parseCatalogSearchCriteria(
        'Sono freelance, cerco modellazione 3D per Linux che possa rivendere sotto 50.000 sats'
      )
    ).toEqual({
      budgetMax: 50000,
      platforms: ['Linux'],
      productQuery: null,
      requiresFreeTransfer: false,
      requiresTransferability: true,
      topic: '3d',
    })
  })

  it('recognizes the reported OmniCloud question as a catalog search', () => {
    const query =
      'VOrrei una licenza omnicloud sotto i 50000 sats con la possibilità di rivendità'

    expect(isCatalogSearchQuery(query)).toBe(true)
    expect(parseCatalogSearchCriteria(query)).toMatchObject({
      budgetMax: 50000,
      productQuery: 'omnicloud',
      requiresTransferability: true,
    })
  })

  it('recognizes a resale question about a named product without a search verb', () => {
    expect(isCatalogSearchQuery('Posso rivendere OmniCloud?')).toBe(true)
  })

  it('returns published catalog listings that meet every explicit filter', () => {
    const result = searchLicexCatalog(
      'Mostrami software di sviluppo per Linux sotto 50.000 sats',
      MOCK_LISTINGS
    )

    expect(result.listings.map((listing) => listing.id)).toEqual(['lic-005'])
  })

  it('does not recommend a non-transferable listing for a resale request', () => {
    const result = searchLicexCatalog(
      'Mostrami software di sviluppo per Linux sotto 50.000 sats che posso rivendere',
      MOCK_LISTINGS
    )

    expect(result.listings).toEqual([])
  })

  it('returns no false positive when the catalog has no listing matching the requested 3D license', () => {
    const result = searchLicexCatalog(
      'Cerco modellazione 3D per Linux rivendibile sotto 50.000 sats',
      MOCK_LISTINGS
    )

    expect(result.listings).toEqual([])
  })

  it('requires a free-transfer policy when the user asks for resale without approval', () => {
    const result = searchLicexCatalog(
      'Trova software di sviluppo per Linux sotto 50k sats liberamente rivendibile senza approvazione',
      MOCK_LISTINGS
    )

    expect(result.criteria.budgetMax).toBe(50000)
    expect(result.criteria.requiresFreeTransfer).toBe(true)
    expect(result.listings).toEqual([])
  })

  it('rejects the reported OmniCloud listing when resale is required and explains the exclusion', () => {
    const omniCloudListing = {
      ...MOCK_LISTINGS[0],
      company: {
        ...MOCK_LISTINGS[0].company,
        name: 'OmniCloud Systems Global Corp',
      },
      id: 'lic-omnicloud',
      price: 15000,
      productName: 'OmniCloud Systems Global Corp',
      status: 'published' as const,
      transferPolicy: 'not_transferable' as const,
    }
    const query =
      'VOrrei una licenza omnicloud sotto i 50000 sats con la possibilità di rivendità'
    const result = searchLicexCatalog(query, [
      omniCloudListing,
      ...MOCK_LISTINGS,
    ])

    expect(result.criteria).toMatchObject({
      budgetMax: 50000,
      productQuery: 'omnicloud',
      requiresTransferability: true,
    })
    expect(result.listings).toEqual([])
    expect(result.nearMatches.map(({ listing }) => listing.id)).toEqual([
      'lic-omnicloud',
    ])
  })

  it('does not treat approval-required transfer as free resale', () => {
    const approvalRequired = {
      ...MOCK_LISTINGS[0],
      id: 'lic-omnicloud-approval',
      price: 15000,
      productName: 'OmniCloud Pro',
      transferPolicy: 'transferable_with_approval' as const,
    }
    const result = searchLicexCatalog(
      'Vorrei una licenza OmniCloud sotto 50.000 sats liberamente rivendibile senza approvazione',
      [approvalRequired]
    )

    expect(result.listings).toEqual([])
    expect(result.nearMatches).toEqual([
      {
        listing: approvalRequired,
        unmetRequirements: ['transferability'],
      },
    ])
  })
})
