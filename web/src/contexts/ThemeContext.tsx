'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type ThemeMode = 'light' | 'dark' | 'admin-light' | 'admin-dark' | 'auto'

interface ThemeContextType {
  isDark: boolean
  isFlashing: boolean
  themeMode: ThemeMode
  setIsDark: (dark: boolean) => void
  toggleTheme: () => void
  handleLightOn: () => void
  setThemeMode: (mode: ThemeMode) => void
  isAdminTheme: boolean
  // Unified theme class utilities
  getThemeClasses: (styles: any) => string
  getConditionalClass: (styles: any, className: string, condition: boolean) => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [baseThemeMode, setBaseThemeModeState] = useState<'light' | 'dark' | 'auto'>('auto')
  const [isFlashing, setIsFlashing] = useState(false)
  const pathname = usePathname()
  
  // Auto-detect admin theme based on current route
  const isOnAdminRoute = pathname?.startsWith('/admin') || false
  
  // Determine final theme mode
  let themeMode: ThemeMode
  if (baseThemeMode === 'auto') {
    // Use system preference, but apply admin variant if on admin route
    themeMode = isOnAdminRoute ? 'admin-light' : 'light' // Default to light, CSS handles system dark
  } else if (isOnAdminRoute) {
    themeMode = baseThemeMode === 'dark' ? 'admin-dark' : 'admin-light'
  } else {
    themeMode = baseThemeMode
  }

  const isDark = themeMode === 'dark' || themeMode === 'admin-dark'
  const isAdminTheme = themeMode === 'admin-light' || themeMode === 'admin-dark'

  // Load base theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('baseTheme') as 'light' | 'dark' | 'auto'
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setBaseThemeModeState(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
  }, [])

  // Apply theme class to body
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    // Remove all theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-admin-light', 'theme-admin-dark')
    
    // Add current theme class (unless auto mode)
    if (baseThemeMode !== 'auto') {
      const themeClass = `theme-${themeMode}`
      document.body.classList.add(themeClass)
    }
  }, [baseThemeMode, themeMode])

  // Save base theme to localStorage when it changes
  const setThemeMode = (mode: ThemeMode) => {
    let baseMode: 'light' | 'dark' | 'auto'
    if (mode === 'dark' || mode === 'admin-dark') {
      baseMode = 'dark'
    } else if (mode === 'light' || mode === 'admin-light') {
      baseMode = 'light'
    } else {
      baseMode = 'auto'
    }
    setBaseThemeModeState(baseMode)
    try {
      localStorage.setItem('baseTheme', baseMode)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  const setIsDark = (dark: boolean) => {
    const newMode = dark ? 'dark' : 'light'
    setBaseThemeModeState(newMode)
    try {
      localStorage.setItem('baseTheme', newMode)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const handleLightOn = () => {
    if (isDark) {
      // Start flashing sequence
      setIsFlashing(true)

      // First flash: dark -> flash -> dark
      setTimeout(() => setIsFlashing(false), 50)
      setTimeout(() => setIsFlashing(true), 100)

      // Second flash: flash -> dark -> flash
      setTimeout(() => setIsFlashing(false), 200)
      setTimeout(() => setIsFlashing(true), 250)

      // Final: turn on lights and stop flashing
      setTimeout(() => {
        setIsDark(false)
        setIsFlashing(false)
      }, 350)
    }
  }

  // Unified theme class utilities
  const getThemeClasses = (styles: any): string => {
    const classes = []
    if (isFlashing) classes.push(styles.flash)
    else if (isDark) classes.push(styles.dark)
    if (isAdminTheme) classes.push(styles.admin)
    return classes.filter(Boolean).join(' ')
  }

  const getConditionalClass = (styles: any, className: string, condition: boolean): string => {
    return condition ? styles[className] || '' : ''
  }

  const value: ThemeContextType = {
    isDark,
    isFlashing,
    themeMode,
    setIsDark,
    toggleTheme,
    handleLightOn,
    setThemeMode,
    isAdminTheme,
    getThemeClasses,
    getConditionalClass
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}