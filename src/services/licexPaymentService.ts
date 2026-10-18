// RGB marketplace transfers must use real node operations.

import type { PaymentQuote } from '../helpers/licexPayments'
import type {
  LicenseListing,
  LicenseRecord,
  Order,
  OrderType,
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

/** Fail closed until the caller supplies node-backed RGB payment callbacks. */
export async function executeLicenseSwap(
  listing: LicenseListing,
  orderType: OrderType = 'primary',
  onStepChange: (step: SwapStep, message?: string) => void
): Promise<SwapExecutionResult> {
  void listing
  void orderType
  onStepChange(
    'error',
    'Scambio non disponibile: servono un invoice RGB del destinatario, un endpoint di trasporto e un pagamento eseguito dal nodo. Nessun asset o pagamento è stato simulato.'
  )
  throw new Error(
    'RGB purchase flow requires a real recipient invoice and node-backed payment'
  )
}
