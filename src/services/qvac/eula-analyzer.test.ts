import { describe, expect, it } from 'vitest'

import { QvacEulaAnalyzer } from './eula-analyzer'
import { EULA_SAMPLES } from './eula-samples'

describe('QvacEulaAnalyzer compliance audit', () => {
  const soundmasterEula = EULA_SAMPLES[0].text

  it('flags a free-transfer claim when the EULA requires approval', () => {
    const result = QvacEulaAnalyzer.analyze(
      soundmasterEula,
      'transferable_free'
    )

    expect(result.extracted.transferPolicy).toBe('transferable_with_approval')
    expect(result.complianceAudit.matchesClaim).toBe(false)
    expect(result.complianceAudit.reviewStatus).toBe('flagged')
    expect(result.reviewStatus).toBe('flagged')
  })

  it('accepts an approval-required claim that matches the EULA', () => {
    const result = QvacEulaAnalyzer.analyze(
      soundmasterEula,
      'transferable_with_approval'
    )

    expect(result.complianceAudit.matchesClaim).toBe(true)
    expect(result.complianceAudit.reviewStatus).toBe('analyzed')
  })

  it('flags a non-transferable claim when the EULA allows transfer with approval', () => {
    const result = QvacEulaAnalyzer.analyze(soundmasterEula, 'not_transferable')

    expect(result.complianceAudit.matchesClaim).toBe(false)
    expect(result.complianceAudit.reviewStatus).toBe('flagged')
    expect(result.complianceAudit.flagReason).toContain('previa autorizzazione')
  })
})
