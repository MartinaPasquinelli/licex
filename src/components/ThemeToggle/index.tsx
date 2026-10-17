import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { setTheme, type Theme } from '../../slices/settings/settings.slice'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  variant?: 'button' | 'icon'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'icon',
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const currentTheme = useAppSelector((state) => state.settings.theme)
  const isDark = currentTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? 'light' : 'dark'
    dispatch(setTheme(nextTheme))
  }

  const label = isDark
    ? t('settings.general.themeLight', 'Modalità Chiara')
    : t('settings.general.themeDark', 'Modalità Scura')

  if (variant === 'button') {
    return (
      <button
        aria-label={label}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-divider/30 bg-surface-overlay/60 hover:bg-surface-overlay text-content-primary hover:border-primary/50 shadow-sm ${className}`}
        onClick={toggleTheme}
        title={label}
        type="button"
      >
        <span className="p-1 rounded-lg bg-surface-base text-primary shadow-sm flex items-center justify-center">
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#9B5094]" />
          )}
        </span>
        {showLabel && <span>{label}</span>}
      </button>
    )
  }

  return (
    <button
      aria-label={label}
      className={`relative p-2.5 rounded-xl border border-divider/30 bg-surface-overlay/60 hover:bg-surface-overlay text-content-primary hover:border-primary/50 transition-all duration-200 shadow-sm flex items-center justify-center group ${className}`}
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      <div className="relative w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400 transition-all animate-fadeIn" />
        ) : (
          <Moon className="w-5 h-5 text-[#9B5094] transition-all animate-fadeIn" />
        )}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold text-content-primary">
          {isDark ? 'Chiaro' : 'Scuro'}
        </span>
      )}
    </button>
  )
}
