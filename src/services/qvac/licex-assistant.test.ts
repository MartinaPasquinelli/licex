import { describe, expect, it } from 'vitest'

import { MOCK_LISTINGS } from '../../constants/licex-mock-data'
import {
  buildLicexAssistantPrompt,
  isUsableQvacStatus,
  parseGroundedAssistantReply,
} from './licex-assistant'

describe('grounded LICEX assistant', () => {
  it('uses QVAC only when the provider is running a real inference backend', () => {
    expect(isUsableQvacStatus({ inferenceDevice: 'gpu', on: true })).toBe(true)
    expect(isUsableQvacStatus({ inferenceDevice: 'cpu', on: true })).toBe(true)
    expect(isUsableQvacStatus({ inferenceDevice: 'mock', on: true })).toBe(
      false
    )
    expect(isUsableQvacStatus({ inferenceDevice: 'gpu', on: false })).toBe(
      false
    )
  })

  it('provides only published catalog facts and recent conversation as model context', () => {
    const prompt = buildLicexAssistantPrompt(
      'Cerco uno strumento per Linux',
      [
        {
          content: 'Sono freelance',
          id: 'message-1',
          role: 'user',
          timestamp: '2026-10-17T10:00:00Z',
        },
      ],
      MOCK_LISTINGS
    )

    expect(prompt).toContain('Sono freelance')
    expect(prompt).toContain('"id":"lic-005"')
    expect(prompt).toContain('"priceSats":45000')
    expect(prompt).not.toContain('"id":"draft-listing"')
    expect(prompt).toContain('Non inventare prodotti')
    expect(prompt).toContain('uso commerciale')
    expect(prompt).toContain('Non restituire JSON')
    expect(prompt).not.toContain('Welcome to LICEX Assistant!')
  })

  it('accepts valid published listing IDs and discards invented or unpublished IDs', () => {
    const publishedId = MOCK_LISTINGS.find(
      (listing) => listing.status === 'published'
    )?.id
    const unpublished = {
      ...MOCK_LISTINGS[0],
      id: 'draft-listing',
      status: 'draft' as const,
    }
    const reply = parseGroundedAssistantReply(
      JSON.stringify({
        answer: 'Questa inserzione rientra nel budget.',
        listingIds: [publishedId, 'invented-id', 'draft-listing', publishedId],
      }),
      [...MOCK_LISTINGS, unpublished]
    )

    expect(reply.answer).toBe('Questa inserzione rientra nel budget.')
    expect(reply.listingIds).toEqual([publishedId])
  })

  it('keeps plain-text model output readable without attaching unverified listings', () => {
    expect(
      parseGroundedAssistantReply('Risposta in italiano.', MOCK_LISTINGS)
    ).toEqual({
      answer: 'Risposta in italiano.',
      listingIds: [],
    })
  })

  it('makes an empty model response visible instead of rendering a blank chat bubble', () => {
    expect(parseGroundedAssistantReply('', MOCK_LISTINGS).answer).toContain(
      'risposta vuota'
    )
  })

  it('recovers a JSON reply wrapped in model prose and preserves only catalog IDs', () => {
    const validId = MOCK_LISTINGS[0].id
    const reply = parseGroundedAssistantReply(
      `Risposta:\n{"answer":"Valuta ${validId}.","listingIds":["invented-id"]}`,
      MOCK_LISTINGS
    )

    expect(reply.listingIds).toEqual([validId])
  })

  it('extracts a readable answer from common alternate JSON response keys', () => {
    const reply = parseGroundedAssistantReply(
      JSON.stringify({
        response: {
          content:
            'Non ho trovato una licenza OmniCloud trasferibile sotto 50.000 sats.',
        },
      }),
      MOCK_LISTINGS
    )

    expect(reply.answer).toBe(
      'Non ho trovato una licenza OmniCloud trasferibile sotto 50.000 sats.'
    )
    expect(reply.answer).not.toContain('{')
  })

  it('converts an unknown structured response to readable text instead of showing raw JSON', () => {
    const reply = parseGroundedAssistantReply(
      JSON.stringify({
        dettaglio: 'OmniCloud non è trasferibile.',
        esito: 'Nessun risultato compatibile.',
      }),
      MOCK_LISTINGS
    )

    expect(reply.answer).toContain('OmniCloud non è trasferibile.')
    expect(reply.answer).toContain('Nessun risultato compatibile.')
    expect(reply.answer).not.toContain('{')
  })

  it('hides malformed JSON output instead of exposing a raw machine payload', () => {
    const reply = parseGroundedAssistantReply(
      '{"answer": "testo non valido", "listingIds": [',
      MOCK_LISTINGS
    )

    expect(reply.answer).not.toContain('{"answer"')
    expect(reply.answer).toContain('risposta strutturata')
  })
})
