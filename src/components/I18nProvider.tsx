import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { RootState } from '../app/store'

interface I18nProviderProps {
  children: React.ReactNode
}

export const I18nProvider = ({ children }: I18nProviderProps) => {
  const { i18n } = useTranslation()
  const settingsLanguage = useSelector(
    (state: RootState) => state.settings.language
  )

  useEffect(() => {
    // Use app-level language setting only
    const preferredLanguage = settingsLanguage || 'en'

    // Sync i18n language with app settings
    if (preferredLanguage && i18n.language !== preferredLanguage) {
      i18n.changeLanguage(preferredLanguage)
    }
  }, [settingsLanguage, i18n])

  return <>{children}</>
}
