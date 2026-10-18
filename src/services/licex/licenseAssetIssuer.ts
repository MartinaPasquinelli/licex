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
  licenseMetadata?: Record<string, unknown>
}

export interface IssuedLicenseAsset extends LicenseAssetReference {
  requestId: string
  issuerSignature?: string
  issuerPubkey?: string
}

export type IssueRgbUda = (
  request: Parameters<import('kaleido-sdk/rln').RlnClient['issueAssetUDA']>[0]
) => Promise<IssueAssetUDAResponse>

export type SignLicenseMetadata = (message: string) => Promise<string>

export interface EulaAnalysisForIssuance {
  id: string
  extracted: {
    productName: string
    edition?: string
    version?: string
    licenseType: string
    durationDays: number | null
    platforms: readonly string[]
    seatsAllowed: number | 'unlimited' | 'unknown'
    commercialUseAllowed: boolean
    transferPolicy: TransferPolicy
    transferFeeMentioned: boolean
    royaltyEstimatePercent?: number
    onlineVerificationRequired: boolean
  }
  clauses: readonly unknown[]
  executiveSummary: string
  aiReviewStatus: string
  complianceAudit: object
  confidenceScore: number
  analysisTimestamp: string
  processingTimeMs: number
  suggestedListing: object
}

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
  if (!crypto.subtle) throw new Error('Web Crypto SHA-256 is unavailable')
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
    ...(input.licenseMetadata
      ? { licenseMetadata: input.licenseMetadata }
      : {}),
  })

// The RGB node validates UDA names as short strings. EULA product names and
// editions can be much longer (or contain multibyte characters), so use a
// conservative 32-byte limit while retaining full values in the signed terms.
const createUdaName = (input: LicenseAssetIssuanceInput): string => {
  const fullName = `${input.productName.trim()} (${input.edition.trim()})`
  const encoder = new TextEncoder()
  let name = ''
  for (const character of fullName) {
    if (encoder.encode(name + character).length > 32) break
    name += character
  }
  const boundedName = name.trim()
  if (!boundedName) throw new Error('Il nome UDA RGB è vuoto o troppo lungo.')
  return boundedName
}

/**
 * Issue a real, unique RGB asset through the connected node.
 * The returned asset id is the RGB contract identifier; no local/demo id is
 * created before the node confirms issuance.
 */
export const issueLicenseRgbAsset = async (
  input: LicenseAssetIssuanceInput,
  issueUda: IssueRgbUda,
  signMetadata: SignLicenseMetadata,
  issuerPubkey: string
): Promise<IssuedLicenseAsset> => {
  validateInput(input)
  if (!issuerPubkey.trim()) throw new Error('RGB issuer public key is required')

  const publicTerms = createPublicTerms(input)
  const metadataHash = await hashText(publicTerms)
  const issuerSignature = await signMetadata(
    `LICEX RGB UDA EULA v1\nrequest:${input.requestId}\nsha256:${metadataHash}`
  )
  const contractDetails = JSON.stringify({
    format: 'licex-eula-uda-v1',
    issuerPubkey,
    issuerSignature,
    metadataHash,
    terms: JSON.parse(publicTerms),
  })
  // RGB UDA `details` is a bounded on-chain string. Keep the full EULA and
  // signer data in the local contract record, and commit its hash plus
  // signature on-chain so the complete terms remain verifiable.
  const onChainDetails = `LICEX1|${metadataHash}|${issuerSignature}`
  if (new TextEncoder().encode(onChainDetails).length > 255) {
    throw new Error(
      'La firma restituita dal wallet è troppo lunga per i dettagli UDA RGB.'
    )
  }
  const ticker =
    input.productName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase() || 'LICEX'
  const response = await issueUda({
    attachments_file_digests: [],
    details: onChainDetails,
    name: createUdaName(input),
    precision: 0,
    ticker,
  })
  const asset = response.asset
  if (!asset?.asset_id) throw new Error('RGB node returned no asset id')

  return {
    assetId: asset.asset_id,
    contractDetails,
    contractId: asset.asset_id,
    issuedAt: new Date().toISOString(),
    issuerPubkey,
    issuerSignature,
    metadataHash,
    mode: 'rgb-node',
    requestId: input.requestId,
    schema: 'UDA',
    status: 'issued',
  }
}

/** Convert analyzed EULA fields into the terms committed to the RGB UDA. */
export const createIssuanceInputFromEula = (
  analysis: EulaAnalysisForIssuance,
  requestId: string
): LicenseAssetIssuanceInput => ({
  edition: analysis.extracted.edition || 'Standard',
  licenseMetadata: {
    aiReviewStatus: analysis.aiReviewStatus,
    analysisId: analysis.id,
    analysisTimestamp: analysis.analysisTimestamp,
    clauses: analysis.clauses,
    commercialUseAllowed: analysis.extracted.commercialUseAllowed,
    complianceAudit: analysis.complianceAudit,
    confidenceScore: analysis.confidenceScore,
    durationDays: analysis.extracted.durationDays,
    executiveSummary: analysis.executiveSummary,
    licenseType: analysis.extracted.licenseType,
    onlineVerificationRequired: analysis.extracted.onlineVerificationRequired,
    platforms: analysis.extracted.platforms,
    processingTimeMs: analysis.processingTimeMs,
    seatsAllowed: analysis.extracted.seatsAllowed,
    suggestedListing: analysis.suggestedListing,
    transferFeeMentioned: analysis.extracted.transferFeeMentioned,
  },
  productName: analysis.extracted.productName,
  requestId,
  royaltyPercent: analysis.extracted.royaltyEstimatePercent ?? 5,
  transferPolicy: analysis.extracted.transferPolicy,
  version: analysis.extracted.version || '1.0',
})

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
