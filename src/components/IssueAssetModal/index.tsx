import { Plus, Loader, Info, X, Sparkles } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

import { useUtxoErrorHandler } from '../../hooks/useUtxoErrorHandler'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { saveDemoRgbAsset } from '../../utils/demoAssets'
import { CreateUTXOModal } from '../CreateUTXOModal'
import { Modal } from '../ui/Modal'

interface IssueAssetModalProps {
  onClose: () => void
  onSuccess: () => void
}

export const IssueAssetModal: React.FC<IssueAssetModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation()
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [precision, setPrecision] = useState('0')
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const { showUtxoModal, setShowUtxoModal, utxoModalProps } =
    useUtxoErrorHandler()

  const [issueAsset] = nodeApi.endpoints.issueNiaAsset.useMutation()

  const actualAmount = useMemo(() => {
    if (
      !amount ||
      isNaN(Number(amount)) ||
      !precision ||
      isNaN(Number(precision))
    )
      return '0'
    return (Number(amount) * Math.pow(10, Number(precision))).toString()
  }, [amount, precision])

  const previewAmount = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return '0'
    let safePrecision = Number(precision)
    if (isNaN(safePrecision) || safePrecision < 0) safePrecision = 0
    if (safePrecision > 10) safePrecision = 10
    return Number(amount).toFixed(safePrecision)
  }, [amount, precision])

  const issueAssetOperation = async () => {
    return await issueAsset({
      amounts: [Number(actualAmount)],
      name,
      precision: Number(precision),
      ticker: (ticker || '').toUpperCase(),
    }).unwrap()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(actualAmount) <= 0) {
      toast.error(
        t('issueAssetModal.amountError', 'The amount must be greater than zero')
      )
      return
    }
    setIsLoading(true)
    try {
      if (isDemoMode) {
        saveDemoRgbAsset({
          amount: Number(actualAmount),
          name,
          precision: Number(precision),
          ticker: (ticker || '').toUpperCase(),
        })
        toast.success(
          t(
            'issueAssetModal.demoSuccess',
            'Asset emesso con successo in Modalità Demo!'
          )
        )
        onSuccess()
        onClose()
        return
      }

      await issueAssetOperation()
      toast.success(t('issueAssetModal.success'))
      onSuccess()
      onClose()
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'data' in error
          ? String((error as { data?: unknown }).data)
          : error instanceof Error
            ? error.message
            : String(error)
      toast.error(
        t('issueAssetModal.failure', 'Emissione RGB fallita: {{message}}', {
          message,
        })
      )
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full bg-surface-overlay/50 text-white px-4 py-2.5 rounded-lg border border-border-default ' +
    'focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none text-sm placeholder-content-tertiary'

  return (
    <>
      <Modal isOpen onClose={onClose} size="sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider/10">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-white">
              {t('issueAssetModal.title')}
            </h3>
          </div>
          <button
            aria-label="Close modal"
            className="p-2 rounded-full hover:bg-surface-overlay text-content-secondary hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-purple-200">
                  {t('issueAssetModal.demoModeToggle', 'Simulazione Demo')}
                </p>
                <p className="text-[11px] text-purple-300/80">
                  {t(
                    'issueAssetModal.demoModeDescription',
                    'Emissione simulata per la demo (senza bisogno di nodi o UTXO Bitcoin reali)'
                  )}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
              <input
                checked={isDemoMode}
                className="sr-only peer"
                onChange={(e) => setIsDemoMode(e.target.checked)}
                type="checkbox"
              />
              <div className="w-9 h-5 bg-surface-overlay peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Info banner if not in demo mode */}
          {!isDemoMode && (
            <div className="flex items-start gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                {t('issueAssetModal.note')}
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">
                {t('issueAssetModal.tickerLabel')}
              </label>
              <input
                className={inputClass}
                maxLength={5}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder={t('issueAssetModal.tickerPlaceholder')}
                required
                type="text"
                value={ticker}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">
                {t('issueAssetModal.nameLabel')}
              </label>
              <input
                className={inputClass}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('issueAssetModal.namePlaceholder')}
                required
                type="text"
                value={name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">
                {t('issueAssetModal.amountLabel')}
              </label>
              <input
                className={inputClass}
                min="0"
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('issueAssetModal.amountPlaceholder')}
                required
                type="number"
                value={amount}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">
                {t('issueAssetModal.precisionLabel')}
              </label>
              <input
                className={inputClass}
                max="18"
                min="0"
                onChange={(e) => {
                  const floored = Math.floor(Number(e.target.value))
                  setPrecision(String(floored))
                }}
                placeholder={t('issueAssetModal.precisionPlaceholder')}
                required
                step="1"
                type="number"
                value={precision}
              />
              {(Number(precision) > 10 || Number(precision) < 0) &&
                precision !== '' && (
                  <p className="text-red-500 text-xs mt-1">
                    {t('issueAssetModal.precisionError')}
                  </p>
                )}
            </div>

            {amount && (
              <p className="text-sm text-content-secondary">
                {t('issueAssetModal.previewPrefix')}{' '}
                <span className="text-white font-medium">{previewAmount}</span>
              </p>
            )}

            <button
              className="w-full px-4 py-2.5 bg-primary hover:bg-primary-emphasis
                       text-primary-foreground rounded-lg text-sm font-semibold transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isLoading
                ? t('issueAssetModal.submitting')
                : t('issueAssetModal.submit')}
            </button>
          </form>
        </div>
      </Modal>

      <CreateUTXOModal
        channelCapacity={utxoModalProps.channelCapacity}
        error={utxoModalProps.error}
        isOpen={showUtxoModal}
        onClose={() => setShowUtxoModal(false)}
        onSuccess={onClose}
        operationType={utxoModalProps.operationType}
        retryFunction={utxoModalProps.retryFunction}
      />
    </>
  )
}
