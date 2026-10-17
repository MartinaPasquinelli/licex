import type {
  LicenseListing,
  OrderStatus,
  PaymentStatus,
} from '../../types/licex'

const SALES_STORAGE_KEY = 'licex_demo_sales'

export interface DemoSaleResult {
  orderId: string
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  transferVerified: boolean
}

const readSales = (): DemoSaleResult[] => {
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Simulates stablecoin payment and RGB transfer checks for the demo market. */
export const executeDemoStablecoinSale = async (
  listing: LicenseListing,
  orderId: string
): Promise<DemoSaleResult> => {
  const existing = readSales().find((sale) => sale.orderId === orderId)
  if (existing) return existing

  if (!listing.rgbAsset || listing.rgbAsset.status !== 'issued') {
    throw new Error('Asset RGB non disponibile per la vendita')
  }
  if (!listing.paymentAsset.toUpperCase().includes('USDT')) {
    throw new Error('La demo richiede un asset di pagamento stablecoin')
  }

  await Promise.resolve()
  const result: DemoSaleResult = {
    orderId,
    orderStatus: 'completed',
    paymentStatus: 'received',
    transferVerified: true,
  }
  localStorage.setItem(
    SALES_STORAGE_KEY,
    JSON.stringify([...readSales(), result])
  )
  return result
}
