import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { useSettings } from '../../hooks/useSettings'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)

    // Keep the native title bar aligned with the selected app theme when the
    // app is running inside Tauri. This is safely ignored in the web preview.
    void getCurrentWindow()
      .setTheme(theme === 'light' ? 'light' : 'dark')
      .catch(() => undefined)
  }, [theme])

  return <>{children}</>
}
