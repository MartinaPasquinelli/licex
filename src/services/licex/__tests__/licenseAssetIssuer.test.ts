import { beforeEach, describe, expect, it } from 'vitest'

import {
  getDemoLicenseIssuance,
  issueDemoLicenseAsset,
} from '../licenseAssetIssuer'

describe('demo license asset issuer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('issues one UDA reference per license request', async () => {
    const first = await issueDemoLicenseAsset({
      edition: 'Pro',
      productName: 'Demo IDE',
      requestId: 'request-1',
      royaltyPercent: 5,
      transferPolicy: 'transferable_free',
      version: '2026.1',
    })
    const second = await issueDemoLicenseAsset({
      edition: 'Pro',
      productName: 'Demo IDE',
      requestId: 'request-2',
      royaltyPercent: 5,
      transferPolicy: 'transferable_free',
      version: '2026.1',
    })

    expect(first.schema).toBe('UDA')
    expect(first.assetId).not.toBe(second.assetId)
    expect(first.contractId).not.toBe(second.contractId)
  })

  it('returns the same asset on retry with the same request id', async () => {
    const input = {
      edition: 'Student',
      productName: 'Demo IDE',
      requestId: 'retry-1',
      royaltyPercent: 0,
      transferPolicy: 'transferable_with_approval' as const,
      version: '2026.1',
    }

    const first = await issueDemoLicenseAsset(input)
    const retry = await issueDemoLicenseAsset(input)

    expect(retry).toEqual(first)
    expect(getDemoLicenseIssuance(input.requestId)).toEqual(first)
  })
})
