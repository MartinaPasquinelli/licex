import { TFunction } from 'i18next'
import {
  FileText,
  HelpCircle,
  MessageCircle,
  Github,
  Plus,
  ShoppingCart,
  Settings,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  HardDriveDownload,
  Link as LinkIcon,
  Droplets,
  Package,
  Heart,
  Sparkles,
  Bot,
  Building2,
  Wallet,
  Key,
  User,
} from 'lucide-react'
import React from 'react'

import {
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_WITHDRAWALS_PATH,
  WALLET_HISTORY_ASSETS_PATH,
  WALLET_HISTORY_CHANNEL_ORDERS_PATH,
  WALLET_HISTORY_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
  WALLET_REMOTE_PATH,
  WALLET_INIT_PATH,
  WALLET_DASHBOARD_PATH,
  SETTINGS_PATH,
  NWC_PATH,
  CHANNELS_PATH,
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
  LICEX_MARKETPLACE_PATH,
  LICEX_MY_LICENSES_PATH,
  LICEX_WATCHLIST_PATH,
  LICEX_WISHLIST_PATH,
  LICEX_ASSISTANT_PATH,
  LICEX_COMPANY_DASHBOARD_PATH,
  ACCOUNT_PATH,
} from '../../app/router/paths'

// Define types for navigation items
export interface NavItem {
  label: string
  icon: React.ReactNode
  to?: string
  matchPath?: string
  matchPaths?: string[]
  action?: string
  url?: string
  subMenu?: {
    icon: React.ReactNode
    label: string
    to?: string
    mode?: string
    disabled?: boolean
  }[]
}

// A labeled group of nav items shown as a category in the sidebar.
export interface NavSection {
  key: 'wallet' | 'licex'
  label: string
  items: NavItem[]
}

// Sidebar navigation, grouped into sections: LICEX (Public/Marketplace) and Account & Wallet.
export const getNavSections = (t: TFunction): NavSection[] => [
  {
    items: [
      {
        icon: <Package className="w-5 h-5" />,
        label: t('navigation.marketplace', 'Marketplace'),
        matchPath: LICEX_MARKETPLACE_PATH,
        to: LICEX_MARKETPLACE_PATH,
      },
      {
        icon: <Bot className="w-5 h-5" />,
        label: t('navigation.assistant', 'LICEX Assistant'),
        matchPath: LICEX_ASSISTANT_PATH,
        to: LICEX_ASSISTANT_PATH,
      },
    ],
    key: 'licex',
    label: 'LICEX',
  },
  {
    items: [
      {
        icon: <User className="w-5 h-5" />,
        label: t('navigation.account', 'Account'),
        matchPath: ACCOUNT_PATH,
        to: ACCOUNT_PATH,
      },
      {
        icon: <Key className="w-5 h-5" />,
        label: t('navigation.myLicenses', 'Le Mie Licenze'),
        matchPath: LICEX_MY_LICENSES_PATH,
        to: LICEX_MY_LICENSES_PATH,
      },
      {
        icon: <Wallet className="w-5 h-5" />,
        label: t('navigation.walletDashboard', 'Wallet & Saldi'),
        matchPath: WALLET_DASHBOARD_PATH,
        to: WALLET_DASHBOARD_PATH,
      },
      {
        icon: <Heart className="w-5 h-5" />,
        label: t('navigation.watchlist', 'Watchlist & Alerts'),
        matchPath: LICEX_WATCHLIST_PATH,
        to: LICEX_WATCHLIST_PATH,
      },
      {
        icon: <Sparkles className="w-5 h-5" />,
        label: t('navigation.wishlist', 'Software Wishlist'),
        matchPath: LICEX_WISHLIST_PATH,
        to: LICEX_WISHLIST_PATH,
      },
    ],
    key: 'wallet',
    label: 'ACCOUNT & WALLET',
  },
]

// Flattened nav items — used for page-title resolution in the header.
export const getMainNavItems = (t: TFunction): NavItem[] =>
  getNavSections(t).flatMap((section) => section.items)

// Channel menu items
export const getChannelMenuItems = (t: TFunction) => [
  {
    icon: <Plus className="w-4 h-4" />,
    label: t('channels.createNewChannel'),
    to: CREATE_NEW_CHANNEL_PATH,
  },
  {
    icon: <ShoppingCart className="w-4 h-4" />,
    label: t('channels.buyAChannel'),
    to: ORDER_CHANNEL_PATH,
  },
  {
    icon: <Settings className="w-4 h-4" />,
    label: t('channels.manageChannels'),
    to: CHANNELS_PATH,
  },
]

export const CHANNEL_MENU_ITEMS = getChannelMenuItems(
  ((key: string) => key.split('.').pop() || key) as any
)

// Transaction menu items
export const getTransactionMenuItems = (t: TFunction) => [
  {
    action: 'deposit',
    icon: (
      <div className="p-1 rounded-full bg-primary/10 text-primary">
        <ArrowDownLeft className="w-4 h-4" />
      </div>
    ),
    label: t('actions.deposit'),
  },
  {
    action: 'withdraw',
    icon: (
      <div className="p-1 rounded-full bg-purple/10 text-purple">
        <ArrowUpRight className="w-4 h-4" />
      </div>
    ),
    label: t('actions.withdraw'),
  },
]

export const TRANSACTION_MENU_ITEMS = getTransactionMenuItems(
  ((key: string) => key.split('.').pop() || key) as any
)

// User settings menu items
export const getUserMenuItems = (t: TFunction) => [
  {
    action: 'support',
    icon: <HelpCircle className="w-4 h-4" />,
    label: t('navigation.helpSupport'),
  },
  {
    icon: <LinkIcon className="w-4 h-4" />,
    label: t('navigation.nwc', 'App Connections'),
    to: NWC_PATH,
  },
  {
    action: 'backup',
    icon: <HardDriveDownload className="w-4 h-4" />,
    label: t('settings.backupWallet'),
  },
]

export const USER_MENU_ITEMS = getUserMenuItems(
  ((key: string) => key.split('.').pop() || key) as any
)

// Support resources for the Help menu
export const getSupportResources = (t: TFunction) => [
  {
    description: t('support.documentationDesc'),
    icon: <FileText className="w-4 h-4" />,
    name: t('support.documentation'),
    url: 'https://docs.kaleidoswap.com',
  },
  {
    description: t('support.faqDesc'),
    icon: <HelpCircle className="w-4 h-4" />,
    name: t('support.faq'),
    url: 'https://docs.kaleidoswap.com/desktop-app/support/faq',
  },
  {
    description: t('support.telegramGroupDesc'),
    icon: <MessageCircle className="w-4 h-4" />,
    name: t('support.telegramGroup'),
    url: 'https://t.me/kaleidoswap',
  },
  {
    description: t('support.githubIssuesDesc'),
    icon: <Github className="w-4 h-4" />,
    name: t('support.githubIssues'),
    url: 'https://github.com/kaleidoswap/desktop-app',
  },
]

export const SUPPORT_RESOURCES = getSupportResources(
  ((key: string) => key.split('.').pop() || key) as any
)

// Page configuration mapping
export const getPageConfig = (t: TFunction) => ({
  [ACCOUNT_PATH]: {
    icon: <User className="w-5 h-5" />,
    title: t('navigation.account', 'Account'),
  },
  [CHANNELS_PATH]: {
    icon: <Droplets className="w-5 h-5" />,
    title: t('navigation.channels', 'Canali Lightning'),
  },
  [CREATE_NEW_CHANNEL_PATH]: {
    icon: <Droplets className="w-5 h-5" />,
    title: t('navigation.channels', 'Nuovo Canale'),
  },
  [LICEX_ASSISTANT_PATH]: {
    icon: <Bot className="w-5 h-5" />,
    title: t('navigation.assistant', 'LICEX Assistant'),
  },
  [LICEX_COMPANY_DASHBOARD_PATH]: {
    icon: <Building2 className="w-5 h-5" />,
    title: t('navigation.publisherDashboard', 'Publisher Dashboard'),
  },
  [LICEX_MARKETPLACE_PATH]: {
    icon: <Package className="w-5 h-5" />,
    title: t('navigation.marketplace', 'Marketplace'),
  },
  [LICEX_MY_LICENSES_PATH]: {
    icon: <Key className="w-5 h-5" />,
    title: t('navigation.myLicenses', 'Le Mie Licenze'),
  },
  [LICEX_WATCHLIST_PATH]: {
    icon: <Heart className="w-5 h-5" />,
    title: t('navigation.watchlist', 'Watchlist & Alerts'),
  },
  [LICEX_WISHLIST_PATH]: {
    icon: <Sparkles className="w-5 h-5" />,
    title: t('navigation.wishlist', 'Software Wishlist'),
  },
  [NWC_PATH]: {
    icon: <LinkIcon className="w-5 h-5" />,
    title: t('navigation.nwc', 'App Connections (NWC)'),
  },
  [ORDER_CHANNEL_PATH]: {
    icon: <Droplets className="w-5 h-5" />,
    title: t('navigation.channels', 'Acquista Canale'),
  },
  [SETTINGS_PATH]: {
    icon: <Settings className="w-5 h-5" />,
    title: t('navigation.settings', 'Impostazioni'),
  },
  [WALLET_DASHBOARD_PATH]: {
    icon: <Wallet className="w-5 h-5" />,
    title: t('navigation.walletDashboard', 'Wallet & Saldi'),
  },
  [WALLET_HISTORY_ASSETS_PATH]: {
    icon: <Clock className="w-5 h-5" />,
    title: t('navigation.history', 'Transazioni'),
  },
  [WALLET_HISTORY_CHANNEL_ORDERS_PATH]: {
    icon: <Clock className="w-5 h-5" />,
    title: t('navigation.history', 'Transazioni'),
  },
  [WALLET_HISTORY_DEPOSITS_PATH]: {
    icon: <Clock className="w-5 h-5" />,
    title: t('navigation.history', 'Transazioni'),
  },
  [WALLET_HISTORY_PATH]: {
    icon: <Clock className="w-5 h-5" />,
    title: t('navigation.history', 'Transazioni'),
  },
  [WALLET_HISTORY_WITHDRAWALS_PATH]: {
    icon: <Clock className="w-5 h-5" />,
    title: t('navigation.history', 'Transazioni'),
  },
})

export const PAGE_CONFIG = getPageConfig(
  ((key: string) => key.split('.').pop() || key) as any
)

export const HIDE_NAVBAR_PATHS = [
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
  WALLET_REMOTE_PATH,
  WALLET_INIT_PATH,
]
