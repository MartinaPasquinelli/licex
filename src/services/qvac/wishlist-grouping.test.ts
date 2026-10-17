import { describe, expect, it } from 'vitest'

import type { WantedSoftwareRequest } from '../../types/licex'
import {
  buildWishlistGroupingPrompt,
  findWishlistMatches,
  parseWishlistGroupingResponse,
} from './wishlist-grouping'

function request(
  id: string,
  values: Partial<WantedSoftwareRequest> = {}
): WantedSoftwareRequest {
  return {
    budget: null,
    consentToAggregation: true,
    createdAt: '2026-10-17T00:00:00.000Z',
    description: '',
    id,
    matchCount: 0,
    platforms: ['Windows'],
    pledgeTotal: 0,
    requirements: [],
    status: 'submitted',
    title: `Request ${id}`,
    updatedAt: '2026-10-17T00:00:00.000Z',
    useCase: '',
    ...values,
  }
}

describe('wishlist grouping', () => {
  it('finds related requests using local fallback matching', () => {
    const newRequest = request('new', {
      category: 'CAD / 3D e conversione file',
      description: 'Serve convertire file CAD DWG in batch.',
      requirements: ['Apertura file DWG', 'Esportazione batch'],
      title: 'Convertitore CAD DWG',
      useCase: 'Conversione file CAD',
    })
    const existing = request('existing', {
      category: 'CAD / 3D e conversione file',
      description: 'Visualizzazione e gestione dei file CAD DWG.',
      requirements: ['Visualizzazione DWG'],
      title: 'Visualizzatore CAD',
      useCase: 'Gestione file CAD',
    })

    const result = findWishlistMatches(newRequest, [existing])

    expect(result.source).toBe('rules')
    expect(result.matches).toEqual([
      expect.objectContaining({
        relation: 'similar',
        requestId: 'existing',
      }),
    ])
  })

  it('does not group unrelated requests only because they share a generic category and platform', () => {
    const newRequest = request('new', {
      category: 'Software e strumenti',
      description: 'A tool for bookkeeping.',
      title: 'Accounting tool',
      useCase: 'Manage invoices',
    })
    const unrelated = request('unrelated', {
      category: 'Software e strumenti',
      description: 'A tool for photo editing.',
      title: 'Image editor',
      useCase: 'Edit photographs',
    })

    expect(findWishlistMatches(newRequest, [unrelated]).matches).toEqual([])
  })

  it('tells the local model to distinguish similar and complementary needs', () => {
    const newRequest = request('new', {
      description: 'Editor CAD offline con esportazione DWG.',
    })
    const existing = request('existing', {
      description: 'Visualizzatore CAD online con annotazioni DWG.',
    })

    const prompt = buildWishlistGroupingPrompt(newRequest, [existing])

    expect(prompt).toContain('modello AI locale sul dispositivo')
    expect(prompt).toContain('complementary')
    expect(prompt).toContain(existing.id)
    expect(prompt).toContain(newRequest.description)
  })

  it('accepts only model matches referencing existing candidate IDs', () => {
    const newRequest = request('new')
    const existing = request('existing')
    const result = parseWishlistGroupingResponse(
      JSON.stringify({
        matches: [
          {
            reason: 'Stesso tipo di software.',
            relation: 'similar',
            requestId: existing.id,
          },
          {
            reason: 'ID inventato.',
            relation: 'complementary',
            requestId: 'not-a-candidate',
          },
        ],
        summary: 'Opportunità CAD.',
      }),
      [existing],
      newRequest
    )

    expect(result).toEqual({
      matches: [
        {
          reason: 'Stesso tipo di software.',
          relation: 'similar',
          requestId: existing.id,
        },
      ],
      source: 'local-model',
      summary: 'Opportunità CAD.',
    })
  })

  it('does not publish identifying text from model-generated group labels', () => {
    const newRequest = request('new', { title: 'CAD conversion' })
    const existing = request('existing')
    const result = parseWishlistGroupingResponse(
      JSON.stringify({
        matches: [
          {
            reason: 'Contattare mario@rossi.it a Milano.',
            relation: 'complementary',
            requestId: existing.id,
          },
        ],
        summary: 'Studio Rossi a Milano',
      }),
      [existing],
      newRequest
    )

    expect(result.summary).toBe('Richieste compatibili per CAD conversion.')
    expect(result.matches[0].reason).toBe(
      'L’AI locale ha rilevato esigenze compatibili.'
    )
  })

  it('uses local matching when the model response is not valid JSON', () => {
    const newRequest = request('new', { title: 'CAD DWG batch converter' })
    const existing = request('existing', {
      title: 'CAD DWG viewer',
      useCase: 'Convert CAD DWG',
    })

    expect(
      parseWishlistGroupingResponse('not JSON', [existing], newRequest)
    ).toEqual(findWishlistMatches(newRequest, [existing]))
  })
})
