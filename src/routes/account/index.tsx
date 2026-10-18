import {
  User,
  Mail,
  Shield,
  Wallet,
  Activity,
  Copy,
  Check,
  Download,
  Upload,
  History,
  Lock,
  Server,
  Globe,
  Key,
  ChevronRight,
  Settings,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  WALLET_HISTORY_DEPOSITS_PATH,
  SETTINGS_PATH,
  CHANNELS_PATH,
} from '../../app/router/paths'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { uiSliceActions } from '../../slices/ui/ui.slice'

export const Component = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [userEmail, setUserEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [savedEmail, setSavedEmail] = useState(
    () => localStorage.getItem('licex_account_email') || ''
  )

  const nodeSettingsData = useAppSelector((state) => state.nodeSettings.data)
  const nodeReachability = useAppSelector((state) => state.node.reachability)
  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()
  const btcBalance = nodeApi.endpoints.btcBalance.useQueryState(undefined)
  const { data: channelsData } =
    nodeApi.endpoints.listChannels.useQuery(undefined)

  const isNodeReachable =
    nodeReachability === 'reachable' ||
    (nodeReachability === 'unknown' && nodeInfo.isSuccess)

  const pubkey = nodeInfo.data?.pubkey || ''
  const { copied: pubkeyCopied, copy: copyPubkey } = useCopyToClipboard()

  const onChainBalance =
    (btcBalance.data?.vanilla?.spendable ?? 0) +
    (btcBalance.data?.colored?.spendable ?? 0)

  const offChainBalance = (channelsData?.channels ?? []).reduce(
    (sum: number, ch: any) => sum + (ch.local_balance_sat || 0),
    0
  )

  const networkLabel =
    nodeSettingsData?.network === 'SignetCustom'
      ? 'Mutinynet'
      : nodeSettingsData?.network || '—'

  const handleSaveEmail = () => {
    const val = userEmail || savedEmail
    localStorage.setItem('licex_account_email', val)
    setSavedEmail(val)
    setIsEditingEmail(false)
  }

  const hasNode = !!nodeSettingsData?.name

  return (
    <div className="w-full h-full overflow-y-auto p-1 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* ── Profile / Email Card ── */}
        <div className="rounded-2xl border border-border-default/60 bg-surface-overlay shadow-xl overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-[#8FB8DE]/30 via-[#9A94BC]/20 to-[#9B5094]/20 relative">
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8FB8DE] to-[#9B5094] flex items-center justify-center shadow-xl ring-4 ring-surface-overlay">
                <User className="w-9 h-9 text-white" />
              </div>
            </div>
          </div>

          <div className="pt-14 px-6 pb-6">
            <h2 className="text-xl font-bold text-content-primary">
              {nodeSettingsData?.name || t('userProfile.myWallet')}
            </h2>
            <p className="text-sm text-content-secondary mt-0.5">
              LicEX Account
            </p>

            {/* Email section */}
            <div className="mt-5 p-4 rounded-xl bg-surface-elevated/50 border border-border-subtle">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-content-secondary">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Email Account
                  </span>
                </div>
                {!isEditingEmail && (
                  <button
                    className="text-xs text-primary font-semibold hover:underline"
                    onClick={() => {
                      setUserEmail(savedEmail)
                      setIsEditingEmail(true)
                    }}
                    type="button"
                  >
                    {savedEmail ? 'Modifica' : 'Aggiungi'}
                  </button>
                )}
              </div>

              {isEditingEmail ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 bg-surface-base border border-border-default rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary focus:border-primary focus:outline-none transition-colors"
                    onChange={(e) => setUserEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEmail()
                      if (e.key === 'Escape') setIsEditingEmail(false)
                    }}
                    placeholder="la-tua@email.com"
                    type="email"
                    value={userEmail}
                  />
                  <button
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    onClick={handleSaveEmail}
                    type="button"
                  >
                    Salva
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-surface-overlay text-content-secondary text-sm hover:bg-surface-elevated transition-colors"
                    onClick={() => setIsEditingEmail(false)}
                    type="button"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <p className="text-sm text-content-primary font-medium">
                  {savedEmail || (
                    <span className="text-content-tertiary italic">
                      Nessuna email configurata
                    </span>
                  )}
                </p>
              )}
              <p className="mt-2 text-xs text-content-tertiary">
                Usata per notifiche licenze, ricevute e recupero account.
              </p>
            </div>

            {/* Quick wallet actions */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  color: 'text-[#8FB8DE]',
                  hover: 'hover:border-primary/40 hover:bg-primary/5',
                  icon: <Download className="w-4 h-4" />,
                  label: t('dashboard.deposit'),
                  onClick: () =>
                    dispatch(
                      uiSliceActions.setModal({
                        assetId: undefined,
                        type: 'deposit',
                      })
                    ),
                },
                {
                  color: 'text-amber-400',
                  hover: 'hover:border-amber-500/40 hover:bg-amber-500/5',
                  icon: <Zap className="w-4 h-4 text-amber-400" />,
                  label: 'Canali',
                  onClick: () => navigate(CHANNELS_PATH),
                },
                {
                  color: 'text-[#9B5094]',
                  hover: 'hover:border-secondary/40 hover:bg-secondary/5',
                  icon: <Upload className="w-4 h-4" />,
                  label: t('dashboard.withdraw'),
                  onClick: () =>
                    dispatch(
                      uiSliceActions.setModal({
                        assetId: undefined,
                        type: 'withdraw',
                      })
                    ),
                },
                {
                  color: 'text-[#9A94BC]',
                  hover: 'hover:border-accent/40 hover:bg-accent/5',
                  icon: <History className="w-4 h-4" />,
                  label: 'Storico',
                  onClick: () => navigate(WALLET_HISTORY_DEPOSITS_PATH),
                },
              ].map(({ icon, label, color, hover, onClick }) => (
                <button
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-surface-elevated/50 border border-border-subtle ${hover} transition-all group`}
                  key={label}
                  onClick={onClick}
                  type="button"
                >
                  <span
                    className={`${color} group-hover:scale-110 transition-transform`}
                  >
                    {icon}
                  </span>
                  <span className="text-xs font-semibold text-content-secondary group-hover:text-content-primary">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Node / Wallet Card ── */}
        <div className="rounded-2xl border border-border-default/60 bg-surface-overlay shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-content-primary">Nodo & Wallet</h3>
            </div>
            {hasNode && (
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isNodeReachable
                    ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isNodeReachable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                />
                {isNodeReachable ? 'Connesso' : 'Disconnesso'}
              </span>
            )}
          </div>

          {hasNode ? (
            <div className="p-6 flex flex-col gap-1">
              {[
                {
                  icon: <Server className="w-4 h-4" />,
                  label: 'Nome account',
                  value: nodeSettingsData.name,
                },
                {
                  icon: <Globe className="w-4 h-4" />,
                  label: 'Rete',
                  value: networkLabel,
                },
                {
                  icon: <Activity className="w-4 h-4" />,
                  label: 'Saldo on-chain',
                  value: `${onChainBalance.toLocaleString()} SAT`,
                },
                {
                  icon: <Zap className="w-4 h-4 text-amber-400" />,
                  label: 'Saldo Lightning (Canali)',
                  value: (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300 font-semibold">
                        {offChainBalance.toLocaleString()} SAT
                      </span>
                      <button
                        className="text-xs text-amber-400 hover:text-amber-300 underline font-medium ml-1"
                        onClick={() => navigate(CHANNELS_PATH)}
                        type="button"
                      >
                        Gestisci Canali →
                      </button>
                    </div>
                  ),
                },
              ].map(({ icon, label, value }) => (
                <div
                  className="flex items-center justify-between py-3 border-b border-border-subtle last:border-none"
                  key={label}
                >
                  <div className="flex items-center gap-2.5 text-content-secondary">
                    <span className="text-primary">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="text-sm font-semibold text-content-primary">
                    {value}
                  </div>
                </div>
              ))}
              {pubkey && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5 text-content-secondary">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Node ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-primary/8 px-2 py-0.5 rounded">
                      {pubkey.slice(0, 12)}…{pubkey.slice(-6)}
                    </code>
                    <button
                      className="text-content-tertiary hover:text-content-primary transition-colors"
                      onClick={() => copyPubkey(pubkey)}
                      title={pubkey}
                      type="button"
                    >
                      {pubkeyCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-elevated flex items-center justify-center">
                <Lock className="w-6 h-6 text-content-tertiary" />
              </div>
              <div>
                <p className="font-semibold text-content-primary">
                  Nessun nodo connesso
                </p>
                <p className="text-sm text-content-secondary mt-1">
                  Collega il tuo nodo Bitcoin per usare il wallet e pagare
                  licenze.
                </p>
              </div>
              <button
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                onClick={() => navigate('/wallet-setup')}
                type="button"
              >
                Connetti nodo
              </button>
            </div>
          )}
        </div>

        {/* ── Security / Settings Card ── */}
        <div className="rounded-2xl border border-border-default/60 bg-surface-overlay shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border-subtle">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-content-primary">
              Sicurezza & Impostazioni
            </h3>
          </div>
          <div className="divide-y divide-border-subtle">
            {[
              {
                description: 'Configura lingua, tema, valuta',
                icon: <Settings className="w-4 h-4" />,
                label: 'Impostazioni',
                onClick: () => navigate(SETTINGS_PATH),
              },
            ].map(({ icon, label, description, onClick }) => (
              <button
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-elevated/30 transition-colors group"
                key={label}
                onClick={onClick}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className="text-primary">{icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-content-primary">
                      {label}
                    </p>
                    <p className="text-xs text-content-secondary">
                      {description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-content-tertiary group-hover:text-content-secondary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
