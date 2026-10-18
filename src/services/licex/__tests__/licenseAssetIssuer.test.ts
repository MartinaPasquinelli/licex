import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDemoLicenseIssuance,
  issueLicenseRgbAsset,
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

  it('uses the RGB node response for real license issuance', async () => {
    const issueUda = vi.fn().mockResolvedValue({
      asset: { asset_id: 'rgb:real-contract-id' },
    })

    const result = await issueLicenseRgbAsset(
      {
        edition: 'Pro',
        productName: 'Node IDE',
        requestId: 'node-1',
        royaltyPercent: 5,
        transferPolicy: 'transferable_free',
        version: '2026.1',
      },
      issueUda
    )

    expect(issueUda).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments_file_digests: [],
        precision: 0,
      })
    )
    expect(result.assetId).toBe('rgb:real-contract-id')
    expect(result.contractId).toBe('rgb:real-contract-id')
    expect(result.mode).toBe('rgb-node')
    expect(result.schema).toBe('UDA')
    expect(getDemoLicenseIssuance('node-1')).toBeUndefined()
  })
})
