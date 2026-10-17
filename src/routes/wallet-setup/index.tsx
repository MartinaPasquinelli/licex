import {
  Wallet,
  ArrowLeftRight,
  Cloud,
  Server,
  Container,
  ArrowLeft,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import {
  WALLET_INIT_PATH,
  WALLET_REMOTE_PATH,
  WALLET_RESTORE_PATH,
} from '../../app/router/paths'
import logoIcon from '../../assets/logo-licex-notext.svg'
import { Layout } from '../../components/Layout'
import {
  NodeOption,
  WalletAction,
  IconWrapper,
} from '../../components/wallet-setup'
import { setAppMode } from '../../slices/settings/settings.slice'
import { useLocalNodeCapabilities } from './useLocalNodeCapabilities'

export const Component = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [nodeType, setNodeType] = useState<'local' | 'remote' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const {
    isNativeSupported,
    isDockerAvailable,
    capabilitiesLoaded,
    localNodeMode,
    setLocalNodeMode,
    checkingCapabilities,
    checkCapabilities,
  } = useLocalNodeCapabilities()

  // Handle transitions
  const handleNodeTypeChange = (type: 'local' | 'remote' | null) => {
    if (type !== nodeType && !isTransitioning) {
      setIsTransitioning(true)

      // Apply fade-out class first
      const content = document.getElementById('wallet-setup-content')
      if (content) {
        content.classList.remove('fade-in')
        content.classList.add('fade-out')
      }

      // Short delay for transition
      setTimeout(() => {
        setNodeType(type)
        if (type === 'local' && !localNodeMode) {
          if (isDockerAvailable) {
            setLocalNodeMode('docker')
          } else if (isNativeSupported) {
            setLocalNodeMode('native')
          }
        }
        setIsTransitioning(false)

        if (content) {
          content.classList.remove('fade-out')
          content.classList.add('fade-in')
        }
      }, 250)
    }
  }

  const navigateToWalletInit = (path: string) => {
    if (localNodeMode === 'docker') {
      // Docker env will be auto-created in wallet-init based on account name
      navigate(`${path}?mode=docker`)
    } else {
      navigate(path)
    }
  }

  return (
    <Layout>
      <div className="relative min-h-full rounded-2xl border border-divider/20 bg-surface-base pb-10 shadow-sm">
        {/* Main Content */}
        <div className="relative flex flex-col p-6">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#9B5094]/5 via-transparent to-[#8FB8DE]/5 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(155,80,148,0.1),transparent_50%)] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-center p-4 pb-8">
            <div className="w-full max-w-4xl">
              <div
                className="fade-in content-container"
                id="wallet-setup-content"
              >
                {!nodeType || nodeType === 'remote' ? (
                  <>
                    <div className="text-center mb-10 slide-in">
                      <div className="relative inline-flex mb-6">
                        {/* Ripple rings */}
                        <div className="absolute inset-0 rounded-2xl bg-primary/15 animate-ripple-1 pointer-events-none" />
                        <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ripple-2 pointer-events-none" />
                        <div
                          className={`${IconWrapper} bg-gradient-to-br from-primary/20 via-primary/10 to-purple/10 border-2 border-primary/40
                          rounded-2xl shadow-2xl shadow-primary/20
                          relative z-10`}
                        >
                          <img alt="LicEX" className="w-8 h-8" src={logoIcon} />
                        </div>
                        {/* Glow */}
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl scale-150 opacity-30 [animation:pulse_6s_ease-in-out_infinite]" />
                      </div>
                      <h1 className="text-3xl md:text-5xl font-bold mb-3 text-content-primary tracking-tight leading-tight py-2">
                        {t('walletSetup.welcomeTo')}{' '}
                        <span className="bg-gradient-to-r from-[#6885b1] via-[#835a7b] to-[#9e1644] bg-clip-text text-transparent">
                          LicEX
                        </span>
                      </h1>
                      <p className="text-sm md:text-base text-content-secondary max-w-lg mx-auto">
                        Collega o avvia il tuo nodo Bitcoin Lightning/RGB per
                        gestire il tuo LicEX Wallet e scambiare licenze
                        software.
                      </p>
                    </div>

                    {!capabilitiesLoaded ? (
                      <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        <NodeOption
                          description={t('walletSetup.remoteNodeDescription')}
                          icon={<Cloud className="w-6 h-6" />}
                          onClick={() => {
                            dispatch(setAppMode('node'))
                            navigate(WALLET_REMOTE_PATH)
                          }}
                          recommended={true}
                          title={t('walletSetup.remoteNodeTitle')}
                        />
                        <NodeOption
                          description={t('walletSetup.localNodeDescription')}
                          icon={
                            <Server
                              className={`w-5 h-5 ${localNodeMode === 'native' ? 'text-[#8FB8DE]' : 'text-content-secondary'}`}
                            />
                          }
                          onClick={() => {
                            dispatch(setAppMode('node'))
                            handleNodeTypeChange('local')
                          }}
                          title={t('walletSetup.localNodeTitle')}
                        />
                      </div>
                    )}
                  </>
                ) : nodeType === 'local' ? (
                  <>
                    <div className="mb-8 slide-in">
                      <button
                        className="px-3 py-2 text-content-secondary hover:text-content-primary transition-colors flex items-center gap-1.5 hover:bg-surface-overlay/50 rounded-lg text-sm"
                        onClick={() => handleNodeTypeChange(null)}
                        type="button"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                      </button>
                    </div>

                    <div className="text-center mb-10 slide-in">
                      <div className="relative inline-flex mb-6">
                        <div
                          className={`${IconWrapper} bg-gradient-to-br from-[#9B5094]/25 via-[#9B5094]/15 to-[#9B5094]/5 border-2 border-[#9B5094]/30
                                        rounded-2xl shadow-2xl shadow-[#9B5094]/15 relative z-10`}
                        >
                          <Server className="w-7 h-7 text-[#9B5094] drop-shadow-[0_0_6px_rgba(155,80,148,0.5)]" />
                        </div>
                        <div className="absolute inset-0 bg-[#9B5094]/15 rounded-2xl blur-xl scale-150 opacity-50" />
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-content-primary leading-tight tracking-tight">
                        {t('walletSetup.setupLocalTitle')}
                      </h1>
                      <p className="text-content-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                        {t('walletSetup.setupLocalSubtitle')}
                      </p>
                    </div>

                    {/* Backend selection — always visible so user knows which backend will run */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <button
                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                          !isNativeSupported
                            ? 'border-border-default/20 bg-surface-elevated/10 opacity-50 cursor-not-allowed'
                            : localNodeMode === 'native'
                              ? 'border-[#8FB8DE] bg-[#8FB8DE]/10 shadow-lg shadow-[#8FB8DE]/10'
                              : 'border-border-default/40 bg-surface-elevated/20 hover:border-border-default/60'
                        }`}
                        disabled={!isNativeSupported}
                        onClick={() => setLocalNodeMode('native')}
                        type="button"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Server
                            className={`w-5 h-5 ${localNodeMode === 'native' ? 'text-status-success' : 'text-content-secondary'}`}
                          />
                          <span
                            className={`font-semibold ${localNodeMode === 'native' ? 'text-content-primary' : 'text-content-secondary'}`}
                          >
                            {t('walletSetup.backendNative')}
                          </span>
                          {!isNativeSupported && (
                            <span className="text-xs text-content-tertiary ml-auto">
                              {t('walletSetup.backendUnavailable')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-content-secondary">
                          {t('walletSetup.backendNativeDescription')}
                        </p>
                      </button>
                      <button
                        className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                          !isDockerAvailable
                            ? 'border-border-default/20 bg-surface-elevated/10 opacity-50 cursor-not-allowed'
                            : localNodeMode === 'docker'
                              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                              : 'border-border-default/40 bg-surface-elevated/20 hover:border-border-default/60'
                        }`}
                        disabled={!isDockerAvailable}
                        onClick={() => setLocalNodeMode('docker')}
                        type="button"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Container
                              className={`w-5 h-5 ${localNodeMode === 'docker' ? 'text-purple-400' : 'text-content-secondary'}`}
                            />
                            <span
                              className={`font-semibold ${localNodeMode === 'docker' ? 'text-purple-400' : 'text-content-secondary'}`}
                            >
                              {t('walletSetup.backendDocker')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isDockerAvailable && (
                              <span className="text-xs text-content-tertiary">
                                {t('walletSetup.backendUnavailable')}
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {t('walletSetup.recommended')}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-content-secondary">
                          {t('walletSetup.backendDockerDescription')}
                        </p>
                      </button>
                    </div>

                    <div
                      aria-live="polite"
                      className="mb-6 flex flex-wrap items-center gap-3"
                    >
                      <button
                        className="rounded-lg border border-white/20 px-4 py-2 text-sm text-content-primary disabled:opacity-50"
                        disabled={checkingCapabilities}
                        onClick={() => void checkCapabilities()}
                        type="button"
                      >
                        {t(
                          checkingCapabilities
                            ? 'walletSetup.checkingBackends'
                            : 'walletSetup.recheckDocker'
                        )}
                      </button>
                      <p className="text-sm text-content-secondary">
                        {t(
                          isDockerAvailable
                            ? 'walletSetup.dockerReady'
                            : 'walletSetup.startDockerHint'
                        )}
                      </p>
                    </div>

                    {/* Message when no backend is available */}
                    {!isNativeSupported && !isDockerAvailable && (
                      <div className="mb-8 p-4 rounded-xl bg-status-warning/10 border border-status-warning/30">
                        <p className="text-sm text-status-warning font-medium mb-1">
                          {t('walletSetup.noBackendAvailable')}
                        </p>
                        <p className="text-xs text-content-secondary">
                          {t('walletSetup.noBackendHint')}
                        </p>
                      </div>
                    )}

                    {/* Create/Restore wallet actions (shown when a backend mode is selected) */}
                    {localNodeMode && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <WalletAction
                          description={t('walletSetup.createWalletDescription')}
                          icon={<Wallet className="w-6 h-6 text-primary" />}
                          onClick={() => navigateToWalletInit(WALLET_INIT_PATH)}
                          primary
                          title={t('walletSetup.createWalletTitle')}
                        />
                        <WalletAction
                          description={t(
                            'walletSetup.restoreWalletDescription'
                          )}
                          icon={
                            <ArrowLeftRight className="w-6 h-6 text-primary" />
                          }
                          onClick={() =>
                            navigateToWalletInit(WALLET_RESTORE_PATH)
                          }
                          title={t('walletSetup.restoreWalletTitle')}
                        />
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
