// ─── QVAC EULA Analyzer Domain Types ──────────────────────────────────────────
// Formal schema for local AI parsing, clause extraction, compliance audit, and
// marketplace listing drafting according to LICEX specifications (US-05, US-06).

import type {
  TransferPolicy,
  LicenseType,
  LicenseListing,
} from '../../types/licex'

export type EulaClauseCategory =
  | 'transferability'
  | 'commercial_use'
  | 'drm_telemetry'
  | 'duration_termination'
  | 'seats_devices'
  | 'liability_warranty'

export type ClauseRiskLevel = 'safe' | 'warning' | 'danger'

export interface EulaClause {
  id: string
  category: EulaClauseCategory
  title: string
  summary: string
  originalQuote: string
  riskLevel: ClauseRiskLevel
  riskReason?: string
  isAmbiguous: boolean
}

export interface EulaExtractedMetadata {
  productName: string
  edition?: string
  version?: string
  licenseType: LicenseType
  durationDays: number | null // null = perpetual right
  platforms: string[]
  seatsAllowed: number | 'unlimited' | 'unknown'
  commercialUseAllowed: boolean
  transferPolicy: TransferPolicy
  transferFeeMentioned: boolean
  royaltyEstimatePercent?: number
  onlineVerificationRequired: boolean
}

export interface EulaComplianceAudit {
  claimedTransferPolicy?: TransferPolicy
  detectedTransferPolicy: TransferPolicy
  matchesClaim: boolean
  flagReason?: string
  reviewStatus: 'analyzed' | 'flagged'
}

export interface EulaAnalysisResult {
  id: string
  extracted: EulaExtractedMetadata
  clauses: EulaClause[]
  executiveSummary: string
  reviewStatus: 'analyzed' | 'flagged'
  complianceAudit: EulaComplianceAudit
  suggestedListing: Partial<LicenseListing>
  analysisTimestamp: string
  processingTimeMs: number
}

export interface EulaSample {
  id: string
  title: string
  subtitle: string
  expectedPolicy: TransferPolicy
  category: string
  text: string
}
