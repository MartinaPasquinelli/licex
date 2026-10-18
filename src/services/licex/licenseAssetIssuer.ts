import { saveDemoRgbAsset } from '../../utils/demoAssets'
import type {
  LicenseAssetReference,
  LicenseAssetMode,
  RgbAssetStatus,
  TransferPolicy,
} from '../../types/licex'
import type { IssueAssetUDAResponse } from 'kaleido-sdk/rln'

const ISSUANCE_STORAGE_KEY = 'licex_demo_license_issuances'

export interface LicenseAssetIssuanceInput {
  requestId: string
  productName: string
  edition: string
  version: string
  transferPolicy: TransferPolicy
  royaltyPercent: number
}

export interface IssuedLicenseAsset extends LicenseAssetReference {
  requestId: string
}

export type IssueRgbUda = (
  request: Parameters<import('kaleido-sdk/rln').RlnClient['issueAssetUDA']>[0]
) => Promise<IssueAssetUDAResponse>

type IssuanceRecord = IssuedLicenseAsset

const readIssuances = (): IssuanceRecord[] => {
  try {
    const raw = localStorage.getItem(ISSUANCE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeIssuances = (records: IssuanceRecord[]): void => {
  localStorage.setItem(ISSUANCE_STORAGE_KEY, JSON.stringify(records))
}

const hashText = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text)
  if (!crypto.subtle) {
    let hash = 2166136261
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619)
    return `${(hash >>> 0).toString(16).padStart(8, '0')}${text.length
      .toString(16)
      .padStart(8, '0')}`.padEnd(64, '0')
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

const validateInput = (input: LicenseAssetIssuanceInput): void => {
  if (!input.requestId.trim()) throw new Error('Missing issuance request id')
  if (!input.productName.trim() || !input.edition.trim()) {
    throw new Error('Product name and edition are required')
  }
  if (!Number.isInteger(input.royaltyPercent) || input.royaltyPercent < 0) {
    throw new Error('Royalty percent must be a non-negative integer')
  }
  if (input.royaltyPercent > 100) {
    throw new Error('Royalty percent must not exceed 100')
  }
}

const createPublicTerms = (input: LicenseAssetIssuanceInput): string =>
  JSON.stringify({
    edition: input.edition,
    productName: input.productName,
    royaltyPercent: input.royaltyPercent,
    transferPolicy: input.transferPolicy,
    version: input.version,
  })

/**
 * Issue a real, unique RGB asset through the connected node.
 * The returned asset id is the RGB contract identifier; no local/demo id is
 * created before the node confirms issuance.
 */
export const issueLicenseRgbAsset = async (
  input: LicenseAssetIssuanceInput,
  issueUda: IssueRgbUda
): Promise<IssuedLicenseAsset> => {
  validateInput(input)

  const publicTerms = createPublicTerms(input)
  const metadataHash = await hashText(publicTerms)
  const ticker =
    input.productName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase() || 'LICEX'
  const response = await issueUda({
    attachments_file_digests: [],
    details: JSON.stringify({ metadataHash, terms: publicTerms }),
    name: `${input.productName} (${input.edition})`,
    precision: 0,
    ticker,
  })
  const asset = response.asset
  if (!asset?.asset_id) throw new Error('RGB node returned no asset id')

  return {
    assetId: asset.asset_id,
    contractId: asset.asset_id,
    issuedAt: new Date().toISOString(),
    metadataHash,
    mode: 'rgb-node',
    requestId: input.requestId,
    schema: 'UDA',
    status: 'issued',
  }
}

/**
 * Demo issuer for the future RGB UDA adapter.
 *
 * It deliberately keeps the software key out of the public asset and stores
 * only a hash of the validated public terms. A request id makes retries
 * idempotent while separate issuance requests still create distinct assets.
 */
export const issueDemoLicenseAsset = async (
  input: LicenseAssetIssuanceInput
): Promise<IssuedLicenseAsset> => {
  validateInput(input)

  const existing = readIssuances().find(
    (record) => record.requestId === input.requestId
  )
  if (existing) return existing

  const publicTerms = createPublicTerms(input)
  const metadataHash = await hashText(publicTerms)
  const issuanceHash = await hashText(`${input.requestId}:${metadataHash}`)
  const asset = saveDemoRgbAsset({
    amount: 1,
    name: `${input.productName} (${input.edition})`,
    precision: 0,
    ticker: input.productName.replace(/[^a-zA-Z]/g, '').slice(0, 8) || 'LIC',
  })

  const issuedAt = new Date().toISOString()
  const result: IssuedLicenseAsset = {
    assetId: asset.asset_id,
    contractId: `rgb:uda:${issuanceHash.slice(0, 32)}`,
    issuedAt,
    metadataHash,
    mode: 'demo' as LicenseAssetMode,
    requestId: input.requestId,
    schema: 'UDA',
    status: 'issued' as RgbAssetStatus,
  }

  writeIssuances([...readIssuances(), result])
  return result
}

export const getDemoLicenseIssuance = (
  requestId: string
): IssuedLicenseAsset | undefined =>
  readIssuances().find((record) => record.requestId === requestId)
