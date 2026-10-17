import { invoke } from '@tauri-apps/api/core'
import type { NostrLicenseOffer, P2PPaymentSplit } from '../types/licexNostr'
import type { LicenseListing, Order, LicenseRecord } from '../types/licex'

export async function getLocalNostrIdentity(): Promise<string> {
  try {
    const realNumber = await invoke<string | null>('nwc_service_npub')
    if (realNumber) {
      return realNumber
    }
  } catch (_e) {
    // Backend Tauri non disponibile: si usa identità Nostr simulata
  }
  return 'npub1licex_local_wallet_77a94klnw9283hxmnv'
}

export function calculateP2PSplit(
  resalePriceUsdt: number,
  royaltyPercent: number,
  publisherName: string
): P2PPaymentSplit {
  const licexFeeUsdt = Number(Math.max(0.5, resalePriceUsdt * 0.01).toFixed(2))
  const publisherRoyaltyUsdt = Number(
    (resalePriceUsdt * (royaltyPercent / 100)).toFixed(2)
  )
  const sellerReceivesUsdt = Number(
    (resalePriceUsdt - publisherRoyaltyUsdt).toFixed(2)
  )
  const totalPaidUsdt = Number((resalePriceUsdt + licexFeeUsdt).toFixed(2))

  return {
    licexFeeUsdt,
    publisherName,
    publisherRoyaltyUsdt,
    sellerReceivesUsdt,
    totalPaidUsdt,
  }
}

export const INITIAL_NOSTR_OFFERS: NostrLicenseOffer[] = [
  {
    createdAt: '2026-10-16T18:00:00Z',
    id: 'p2p-nostr-001',
    licenseRecordId: 'lr-demo-p2p',
    listing: {
      category: 'Development',
      company: {
        companyStatus: 'verified',
        defaultRoyaltyPercent: 5,
        defaultTransferPolicy: 'transferable_free',
        description: 'Developer IDE tools',
        domain: 'devflow.dev',
        id: 'comp-003',
        logoUrl: '',
        name: 'DevFlow',
        refundPolicy: 'No refunds on P2P resale',
        verifiedAt: '2026-09-01T09:00:00Z',
      },
      companyId: 'comp-003',
      createdAt: '2026-09-01T10:00:00Z',
      durationDays: null,
      edition: 'Pro Edition (Perpetual)',
      id: 'lic-003',
      imageUrl: '',
      licenseType: 'perpetual',
      maxTransfers: 5,
      minHoldingDays: 14,
      paymentAsset: 'RGB-USDT',
      platforms: ['macOS', 'Linux', 'Windows'],
      price: 120, // Prezzo da nuovo: 120 USDT
      productDescription:
        'Licenza perpetual usata per 6 mesi. Ceduta causa passaggio a stack cloud.',
      productName: 'DevFlow Enterprise Suite',
      royaltyPercent: 5,
      status: 'published',
      tags: ['ide', 'developer', 'p2p-resale'],
      transferPolicy: 'transferable_free',
      updatedAt: '2026-10-16T18:00:00Z',
      version: 'v2026.3',
    },
    nostrEventId: 'e4d8a1f9b3c2...nostr77a',
    resalePriceUsdt: 65, // Prezzo usato scontato: 65 USDT (-45%)
    royaltyPercent: 5,
    sellerName: 'SatoshiDev (npub1q8...)',
    sellerNpub: 'npub1q892klnw9283hxmnv9823klnsdf923',
    status: 'active',
    transferCount: 1,
    transferPolicy: 'transferable_free',
  },
]
/**
 * Pubblica una licenza su Nostr (trasmissione evento ai Relay)
 */
export async function broadcastNostrResaleOffer(
  listing: LicenseListing,
  licenseRecordId: string,
  resalePriceUsdt: number
): Promise<NostrLicenseOffer> {
  // Prende la vera identità dell'app dal modulo Rust di KaleidoSwap
  const sellerNpub = await getLocalNostrIdentity()
  // Simula il broadcast di rete sui Relay Nostr configurati
  await new Promise((resolve) => setTimeout(resolve, 700))
  const newOffer: NostrLicenseOffer = {
    createdAt: new Date().toISOString(),
    id: `p2p-${Date.now()}`,
    licenseRecordId,
    listing,
    nostrEventId: `nostr_ev_${Math.random().toString(16).substring(2, 12)}`,
    resalePriceUsdt,
    royaltyPercent: listing.royaltyPercent,
    sellerName: `Tu (${sellerNpub.slice(0, 10)}...)`,
    sellerNpub,
    status: 'active',
    transferCount: 1,
    transferPolicy: listing.transferPolicy,
  }
  return newOffer
}

export async function executeP2PAtomicSwap(offer: NostrLicenseOffer): Promise<{
  order: Order
  newLicenseRecord: LicenseRecord
  transferredSealUtxo: string
}> {
  const split = calculateP2PSplit(
    offer.resalePriceUsdt,
    offer.royaltyPercent,
    offer.listing.company.name
  )
  const timestamp = Date.now()
  const orderId = `ord-p2p-${timestamp}`
  const newLicenseRecordId = `lr-p2p-${timestamp}`
  // Simulazione broadcast scambio atomico P2P su Bitcoin / Nostr
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const mockTxid = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  const transferredSealUtxo = `txid:${mockTxid.slice(0, 16)}...:1`

  const order: Order = {
    buyerId: 'user-current',
    companyId: offer.listing.companyId,
    createdAt: new Date().toISOString(),
    id: orderId,
    licexFee: split.licexFeeUsdt,
    listing: offer.listing,
    listingId: offer.listing.id,
    orderStatus: 'completed',
    paymentStatus: 'received',
    price: offer.resalePriceUsdt,
    royalty: split.publisherRoyaltyUsdt, // Royalty accreditata alla software house!
    sellerId: offer.sellerNpub,
    type: 'resale',
  }
  const newLicenseRecord: LicenseRecord = {
    activatedAt: new Date().toISOString(),
    activationStatus: 'confirmed',
    id: newLicenseRecordId,
    licenseStatus: 'active',
    listing: offer.listing,
    orderId,
    transferCount: offer.transferCount + 1, // Incremento del contatore dei trasferimenti
  }
  return {
    newLicenseRecord,
    order,
    transferredSealUtxo,
  }
}
