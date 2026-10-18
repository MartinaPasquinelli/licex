import { beforeEach, describe, expect, it } from 'vitest'

import {
  loadLocalOwnedLicenses,
  saveLocalOwnedLicenses,
  loadLocalOrders,
  saveLocalOrders,
  resetLocalLicexDatabase,
  exportLocalDatabase,
  importLocalDatabase,
} from '../licexStorage'
import {
  MOCK_OWNED_LICENSES,
  MOCK_ORDERS,
} from '../../../constants/licex-mock-data'
import type { LicenseRecord, Order } from '../../../types/licex'

describe('licex local storage database', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seeds default owned licenses and orders on initial empty run', () => {
    const licenses = loadLocalOwnedLicenses()
    const orders = loadLocalOrders()

    expect(licenses).toHaveLength(MOCK_OWNED_LICENSES.length)
    expect(orders).toHaveLength(MOCK_ORDERS.length)
  })

  it('persists newly acquired licenses across reloads', () => {
    const initial = loadLocalOwnedLicenses()
    const testLicense: LicenseRecord = {
      ...initial[0],
      activationStatus: 'confirmed',
      id: 'test-lic-persist-123',
      licenseStatus: 'active',
    }

    saveLocalOwnedLicenses([testLicense, ...initial])

    const retrieved = loadLocalOwnedLicenses()
    expect(retrieved).toHaveLength(initial.length + 1)
    expect(retrieved[0].id).toBe('test-lic-persist-123')
  })

  it('persists new orders across reloads', () => {
    const initial = loadLocalOrders()
    const testOrder: Order = {
      ...initial[0],
      createdAt: new Date().toISOString(),
      id: 'test-order-persist-999',
      orderStatus: 'completed',
    }

    saveLocalOrders([testOrder, ...initial])

    const retrieved = loadLocalOrders()
    expect(retrieved).toHaveLength(initial.length + 1)
    expect(retrieved[0].id).toBe('test-order-persist-999')
  })

  it('persists wishlist, company stats and chat history', () => {
    const dump = exportLocalDatabase()
    expect(dump).toContain('wishlist')
    expect(dump).toContain('companyStats')
    expect(dump).toContain('chatMessages')
  })

  it('exports and imports the entire local database correctly', () => {
    const dump = exportLocalDatabase()
    expect(dump).toContain('version')
    expect(dump).toContain('ownedLicenses')

    resetLocalLicexDatabase()
    expect(localStorage.length).toBe(0)

    const imported = importLocalDatabase(dump)
    expect(imported).toBe(true)
    expect(loadLocalOwnedLicenses()).toHaveLength(MOCK_OWNED_LICENSES.length)
  })

  it('rejects lightning payment if spendable channel balance is insufficient or 0', async () => {
    const { executeLicenseSwap } = await import('../../licexPaymentService')
    const testListing = MOCK_OWNED_LICENSES[0].listing

    await expect(
      executeLicenseSwap(testListing, 'primary', () => {}, {
        method: 'lightning',
        sendPaymentFn: async () => ({ status: 'Succeeded' }),
        spendableBalanceSats: 0,
      })
    ).rejects.toThrow(/Saldo Lightning insufficiente/)
  })

  it('rejects lightning payment if node payment routing fails', async () => {
    const { executeLicenseSwap } = await import('../../licexPaymentService')
    const testListing = MOCK_OWNED_LICENSES[0].listing

    await expect(
      executeLicenseSwap(testListing, 'primary', () => {}, {
        method: 'lightning',
        sendPaymentFn: async () => ({ status: 'Failed' }),
        spendableBalanceSats: 500000,
      })
    ).rejects.toThrow(/Pagamento Lightning fallito/)
  })

  it('calculates lightning quotes and processes real lightning payment swap when funded', async () => {
    const { calculateLightningQuote } =
      await import('../../../helpers/licexPayments')
    const { executeLicenseSwap } = await import('../../licexPaymentService')
    const testListing = MOCK_OWNED_LICENSES[0].listing

    const quote = calculateLightningQuote(testListing, 'primary')
    expect(quote.totalPriceSats).toBeGreaterThan(0)
    expect(quote.formattedTotalSats).toContain('sats')
    expect(quote.simulatedInvoice).toMatch(/^lnbc/)

    const stepsRecorded: string[] = []
    const result = await executeLicenseSwap(
      testListing,
      'primary',
      (step) => stepsRecorded.push(step),
      {
        method: 'lightning',
        sendPaymentFn: async () => ({
          payment_preimage:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          status: 'Succeeded',
        }),
        spendableBalanceSats: quote.totalPriceSats + 10000,
      }
    )

    expect(result.order.paymentMethod).toBe('lightning')
    expect(result.order.lightningPreimage).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    )
    expect(result.licenseRecord.activationStatus).toBe('confirmed')
    expect(stepsRecorded).toContain('signing')
    expect(stepsRecorded).toContain('broadcasting')
    expect(stepsRecorded).toContain('proof_of_holding')
    expect(stepsRecorded).toContain('completed')

    // Persist to local storage
    saveLocalOwnedLicenses([result.licenseRecord, ...loadLocalOwnedLicenses()])
    saveLocalOrders([result.order, ...loadLocalOrders()])

    const savedLicenses = loadLocalOwnedLicenses()
    const savedOrders = loadLocalOrders()
    expect(savedLicenses.some((l) => l.id === result.licenseRecord.id)).toBe(
      true
    )
    expect(
      savedOrders.some(
        (o) => o.id === result.order.id && o.paymentMethod === 'lightning'
      )
    ).toBe(true)
  })

  it('rejects USDT swap if spendable USDT balance is insufficient or 0', async () => {
    const { executeLicenseSwap } = await import('../../licexPaymentService')
    const testListing = MOCK_OWNED_LICENSES[0].listing

    await expect(
      executeLicenseSwap(testListing, 'primary', () => {}, {
        method: 'usdt_swap',
        spendableUsdtBalance: 0,
      })
    ).rejects.toThrow(/Saldo USDT insufficiente/)
  })

  it('executes and persists USDT swap when spendable USDT balance is sufficient', async () => {
    const { calculatePaymentQuote } =
      await import('../../../helpers/licexPayments')
    const { executeLicenseSwap } = await import('../../licexPaymentService')
    const testListing = MOCK_OWNED_LICENSES[0].listing
    const quote = calculatePaymentQuote(testListing, 'primary')

    const result = await executeLicenseSwap(testListing, 'primary', () => {}, {
      method: 'usdt_swap',
      spendableUsdtBalance: quote.totalPrice + 100,
    })

    expect(result.order.paymentMethod).toBe('usdt_swap')
    expect(result.licenseRecord.activationStatus).toBe('confirmed')

    saveLocalOwnedLicenses([result.licenseRecord, ...loadLocalOwnedLicenses()])
    saveLocalOrders([result.order, ...loadLocalOrders()])

    const savedOrders = loadLocalOrders()
    expect(
      savedOrders.some(
        (o) => o.id === result.order.id && o.paymentMethod === 'usdt_swap'
      )
    ).toBe(true)
  })
})
