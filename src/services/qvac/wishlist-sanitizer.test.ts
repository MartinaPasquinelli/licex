import { describe, expect, it } from 'vitest'

import {
  buildWishlistRfpPrompt,
  createWishlistRfp,
  parseWishlistRfpResponse,
  sanitizeWishlistText,
} from './wishlist-sanitizer'

describe('wishlist privacy sanitizer and RFP extraction', () => {
  const rawRequest =
    'Nel mio studio a Milano (Studio Rossi & Associati) usiamo un software interno scritto da mario@rossi.it per gestire i file CAD, ma va in crash su Windows 11. Vorrei un’alternativa moderna con file DWG ed esportazione batch e pagherei 500$ in bitcoin.'

  it('redacts email, organization, and known city before producing text for sharing', () => {
    const result = sanitizeWishlistText(rawRequest)

    expect(result.sanitizedText).not.toContain('Milano')
    expect(result.sanitizedText).not.toContain('Studio Rossi')
    expect(result.sanitizedText).not.toContain('mario@rossi.it')
    expect(result.sanitizedText).toContain('[LOCALITÀ RIMOSSA]')
    expect(result.sanitizedText).toContain('[ORGANIZZAZIONE RIMOSSA]')
    expect(result.sanitizedText).toContain('[EMAIL RIMOSSA]')
    expect(result.redactions).toEqual(
      expect.arrayContaining([
        'indirizzi email',
        'nomi di organizzazioni',
        'città e località',
      ])
    )
  })

  it('redacts personally named references when they are written as plain text', () => {
    const result = sanitizeWishlistText(
      'Mi chiamo Mario Rossi e lavoro a Torino. Il software è gestito da Luca Bianchi.'
    )

    expect(result.sanitizedText).not.toContain('Mario Rossi')
    expect(result.sanitizedText).not.toContain('Luca Bianchi')
    expect(result.sanitizedText).not.toContain('Torino')
    expect(result.redactions).toEqual(
      expect.arrayContaining(['nominativi', 'città e località'])
    )
  })

  it('converts the example into a structured CAD RFP and estimates USD in sats', () => {
    const rfp = createWishlistRfp(rawRequest, 100000)

    expect(rfp).toMatchObject({
      budgetFiat: 500,
      budgetSats: 500000,
      category: 'CAD / 3D e conversione file',
      platforms: ['Windows'],
      sanitizationSource: 'rules',
      title: 'Alternativa CAD / 3D',
    })
    expect(rfp.requirements).toEqual(
      expect.arrayContaining([
        'Compatibilità con Windows 11',
        'Apertura e gestione di file DWG',
        'Esportazione o conversione batch',
        'Funzionamento stabile senza crash',
        'Alternativa moderna al software attualmente utilizzato',
      ])
    )
    expect(rfp.description).not.toContain('rossi.it')
    expect(rfp.description).not.toContain('Studio Rossi')
    expect(rfp.publicDescription).toContain(
      'In ambito professionale usiamo un software interno per gestire i file CAD'
    )
    expect(rfp.publicDescription).not.toMatch(/\[[A-ZÀ-Ú ]+ RIMOSSA\]/i)
    expect(rfp.publicDescription).toContain('Windows 11')
    expect(rfp.publicDescription).toContain('file DWG')
    expect(rfp.publicDescription).toContain('esportazione batch')
    expect(rfp.publicDescription).toContain('500$')
  })

  it('does not fabricate a sats conversion when the BTC/USD price is unavailable', () => {
    expect(
      createWishlistRfp('Pagherei $500 per un convertitore CAD').budgetSats
    ).toBeNull()
  })

  it('preserves an explicitly stated sats budget without needing a price feed', () => {
    expect(
      createWishlistRfp('Cerco un CAD e pagherei 15.000 sats').budgetSats
    ).toBe(15000)
  })

  it('asks the local model to redact the original request before publication', () => {
    const prompt = buildWishlistRfpPrompt(rawRequest)

    expect(prompt).toContain('esclusivamente da un modello AI locale')
    expect(prompt).toContain('Individua e rimuovi')
    expect(prompt).toContain(rawRequest)
    expect(prompt).toContain('"redactions"')
    expect(prompt).toContain('frase breve, naturale e completa')
  })

  it('sanitizes model-generated fields before using them in the preview', () => {
    const fallback = createWishlistRfp(rawRequest)
    const parsed = parseWishlistRfpResponse(
      JSON.stringify({
        category: 'CAD',
        platforms: ['Windows', 'Plan 9'],
        requirements: [
          'Windows 11',
          'Contatto: mario@rossi.it',
          'Gestione DWG',
        ],
        title: 'Studio Rossi CAD',
        useCase: 'Lavoro per Studio Rossi a Milano',
      }),
      fallback
    )

    expect(parsed.title).not.toContain('Studio Rossi')
    expect(parsed.useCase).not.toContain('Milano')
    expect(parsed.requirements).not.toContain('Contatto: mario@rossi.it')
    expect(parsed.platforms).toEqual(['Windows'])
    expect(parsed.redactions).toEqual(
      expect.arrayContaining(['indirizzi email', 'città e località'])
    )
  })

  it('uses the model rewrite when it is clean and grammatical', () => {
    const fallback = createWishlistRfp(rawRequest)
    const parsed = parseWishlistRfpResponse(
      JSON.stringify({
        publicDescription:
          'In ambito professionale cerco un’alternativa CAD moderna e stabile per Windows 11, con supporto DWG ed esportazione batch; budget 500$.',
        redactions: ['nominativi', 'città e località'],
      }),
      fallback
    )

    expect(parsed.publicDescription).toBe(
      'In ambito professionale cerco un’alternativa CAD moderna e stabile per Windows 11, con supporto DWG ed esportazione batch; budget 500$.'
    )
    expect(parsed.sanitizationSource).toBe('local-model')
    expect(parsed.redactions).toEqual(
      expect.arrayContaining(['nominativi', 'città e località'])
    )
  })

  it('falls back to the local safe sentence if the model introduces identifying data', () => {
    const fallback = createWishlistRfp(rawRequest)
    const parsed = parseWishlistRfpResponse(
      JSON.stringify({
        publicDescription:
          'Lo Studio Rossi a Milano usa un CAD scritto da mario@rossi.it.',
      }),
      fallback
    )

    expect(parsed.publicDescription).toBe(fallback.publicDescription)
    expect(parsed.sanitizationSource).toBe('rules')
    expect(parsed.publicDescription).not.toMatch(
      /Milano|Studio Rossi|mario@rossi\.it|\[[A-ZÀ-Ú ]+ RIMOSSA\]/i
    )
  })
})
