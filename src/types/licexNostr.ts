import type { LicenseListing, TransferPolicy } from '../types/licex'

export type P2POfferStatus = 'active' | 'pending' | 'completed' | 'cancelled'

export interface NostrLicenseOffer {
  id: string
  nostrEventId: string
  sellerNpub: string
  sellerName: string
  licenseRecordId: string
  listing: LicenseListing
  resalePriceUsdt: number
  royaltyPercent: number
  transferPolicy: TransferPolicy
  transferCount: number
  createdAt: string
  status: P2POfferStatus
}

export interface P2PPaymentSplit {
  totalPaidUsdt: number
  sellerReceivesUsdt: number
  publisherRoyaltyUsdt: number
  licexFeeUsdt: number
  publisherName: string
}
