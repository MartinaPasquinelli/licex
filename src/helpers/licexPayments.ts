// Licex payments

import type { LicenseListing, OrderType } from '../types/licex'

export interface PaymentQuote {
  basePrice: number
  paymentAsset: string
  licexFee: number
  royaltyFee: number
  sellerReceives: number
  totalPrice: number
  formattedPrice: string
  formattedFee: string
  formattedTotal: string
  isResale: boolean
  royaltyRecipient: string
  royaltyPercent: number
}

export function formatUstd(price: number): string {
  return `${price.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} USDT`
}

export function calculatePaymentQuote(
  listing: LicenseListing,
  orderType: OrderType = 'primary'
): PaymentQuote {
  const basePrice = listing.price
  const paymentAsset = listing.paymentAsset || 'RGB-USTD'

  const licexFee = Math.max(0.5, Number((basePrice * 0.01).toFixed(2))) // Assuming a 2% fee for the platform, with a minimum of 0.5

  const isResale = orderType === 'resale'
  const royaltyPercent = isResale ? listing.royaltyPercent : 0
  const royalty = Number((basePrice * (royaltyPercent / 100)).toFixed(2))

  const sellerReceives = Number((basePrice - royalty).toFixed(2))
  const totalPrice = Number((basePrice + licexFee).toFixed(2))

  return {
    basePrice,
    formattedFee: formatUstd(licexFee),
    formattedPrice: formatUstd(basePrice),
    formattedTotal: formatUstd(Number(totalPrice)),
    isResale,
    licexFee,
    paymentAsset,
    royaltyFee: royalty,
    royaltyPercent,
    royaltyRecipient: listing.companyId, // Assuming the company ID is the recipient of royalties
    sellerReceives: Number(sellerReceives),
    totalPrice: Number(totalPrice),
  }
}

export function generateProofOfHolding(licenseId: string, buyerPubkey: string) {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).substring(2, 10).toUpperCase()
  return {
    challengeString: `LICEX:PROOF_OF_HOLDING:LIC=${licenseId}:HOLDER=${buyerPubkey}:TS=${timestamp}:NONCE=${nonce}`,
    expiresAt: new Date(timestamp + 300_000).toISOString(),
    nonce,
  }
}

export interface LightningPaymentQuote {
  basePriceSats: number
  licexFeeSats: number
  royaltyFeeSats: number
  sellerReceivesSats: number
  totalPriceSats: number
  formattedPriceSats: string
  formattedFeeSats: string
  formattedTotalSats: string
  isResale: boolean
  royaltyRecipient: string
  royaltyPercent: number
  simulatedInvoice: string
}

export function calculateLightningQuote(
  listing: LicenseListing,
  orderType: OrderType = 'primary'
): LightningPaymentQuote {
  const basePriceSats =
    listing.price >= 500
      ? Math.round(listing.price)
      : Math.round(listing.price * 1500)
  const licexFeeSats = Math.max(50, Math.round(basePriceSats * 0.01))
  const isResale = orderType === 'resale'
  const royaltyPercent = isResale ? listing.royaltyPercent : 0
  const royaltyFeeSats = Math.round(basePriceSats * (royaltyPercent / 100))
  const sellerReceivesSats = basePriceSats - royaltyFeeSats
  const totalPriceSats = basePriceSats + licexFeeSats

  const hash32 = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  const simulatedInvoice = `lnbc${totalPriceSats}0n1p${hash32.slice(0, 20)}pp5licex`

  return {
    basePriceSats,
    formattedFeeSats: `${licexFeeSats.toLocaleString()} sats`,
    formattedPriceSats: `${basePriceSats.toLocaleString()} sats`,
    formattedTotalSats: `${totalPriceSats.toLocaleString()} sats`,
    isResale,
    licexFeeSats,
    royaltyFeeSats,
    royaltyPercent,
    royaltyRecipient: listing.companyId,
    sellerReceivesSats,
    simulatedInvoice,
    totalPriceSats,
  }
}
