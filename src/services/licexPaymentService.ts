// Scambio tra RGB-USTD e token di licenza sofwtare

import {
  calculatePaymentQuote,
  generateProofOfHolding,
  type PaymentQuote,
} from '../helpers/licexPayments'

import type {
  LicenseListing,
  OrderType,
  Order,
  LicenseRecord,
} from '../types/licex'

export type SwapStep =
  | 'quote'
  | 'signing'
  | 'broadcasting'
  | 'proof_of_holding'
  | 'completed'
  | 'error'

export interface DigitalLicenseCertificate {
  contractId: string
  genesisAnchor: string
  sealUtxo: string
  schemaType: string
  issuerKey: string
  issuedAt: string
  holderPubkey: string
  activationMode: 'wallet_handshake'
  proofOfHoldingHash: string
}

export interface SwapExecutionResult {
  order: Order
  licenseRecord: LicenseRecord
  certificate: DigitalLicenseCertificate
  quote: PaymentQuote
}

export async function executeLicenseSwap(
  listing: LicenseListing,
  orderType: OrderType = 'primary',
  onStepChange: (step: SwapStep, message?: string) => void
): Promise<SwapExecutionResult> {
  const quote = calculatePaymentQuote(listing, orderType)
  const timestamp = Date.now()
  const randomHexId = Math.random().toString(16).substring(2, 6).toUpperCase()
  const orderId = `ord-${timestamp}`
  const licenseRecordId = `lic-${listing.id.replace(/^lic-/, '')}-${randomHexId}-${timestamp.toString().slice(-4)}`
  const mockBuyerPubkey =
    '02a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

  try {
    onStepChange(
      'signing',
      'Firma crittografica del pagamento in RGB-USDT nel wallet...'
    )
    await new Promise((resolve) => setTimeout(resolve, 800))

    onStepChange(
      'broadcasting',
      'Scambio atomico in corso su Bitcoin: impegno simultaneo di ' +
        quote.formattedTotal +
        ' e Asset RGB25...'
    )

    await new Promise((resolve) => setTimeout(resolve, 1100))

    onStepChange(
      'proof_of_holding',
      'Associazione crittografica dell’Asset RGB25 al Single-Use Seal del tuo wallet...'
    )
    void generateProofOfHolding(listing.id, mockBuyerPubkey)
    await new Promise((resolve) => setTimeout(resolve, 900))

    // Creazione certificato crittografico nativo RGB25 (Codeless)
    const mockTxid = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    const certificate: DigitalLicenseCertificate = {
      activationMode: 'wallet_handshake',
      contractId: `rgb1${Math.random().toString(36).substring(2, 12)}licex${listing.id}`,
      genesisAnchor: `mutinynet:block#89412:${mockTxid.slice(0, 8)}`,
      holderPubkey: mockBuyerPubkey,
      issuedAt: new Date().toISOString(),
      issuerKey: `schnorr:pk_${listing.companyId}_verified`,
      proofOfHoldingHash: `poh_${randomHexId}_${timestamp}`,
      schemaType: 'RGB25/UDA (Codeless License Asset)',
      sealUtxo: `txid:${mockTxid.slice(0, 16)}...:1`,
    }
    const order: Order = {
      buyerId: 'user-current',
      companyId: listing.companyId,
      createdAt: new Date().toISOString(),
      id: orderId,
      licexFee: quote.licexFee,
      listing,
      listingId: listing.id,
      orderStatus: 'completed',
      paymentStatus: 'received',
      price: listing.price,
      royalty: quote.royaltyFee,
      sellerId: listing.companyId,
      type: orderType,
    }
    const licenseRecord: LicenseRecord = {
      activatedAt: new Date().toISOString(),
      activationStatus: 'confirmed',
      id: licenseRecordId,
      licenseStatus: 'active',
      listing,
      orderId,
      transferCount: 0,
    }
    onStepChange(
      'completed',
      'Asset RGB25 assegnato con successo al tuo wallet!'
    )
    return {
      certificate,
      licenseRecord,
      order,
      quote,
    }
  } catch (err: any) {
    onStepChange('error', err?.message || 'Errore durante lo scambio atomico')
    throw err
  }
}
