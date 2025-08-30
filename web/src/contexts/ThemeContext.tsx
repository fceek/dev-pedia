'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type ThemeMode = 'light' | 'dark' | 'admin-light' | 'admin-dark'

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
  const [baseThemeMode, setBaseThemeModeState] = useState<'light' | 'dark'>('light')
  const [isFlashing, setIsFlashing] = useState(false)
  const pathname = usePathname()
  
  // Auto-detect admin theme based on current route
  const isOnAdminRoute = pathname?.startsWith('/admin') || false
  const themeMode: ThemeMode = isOnAdminRoute 
    ? (baseThemeMode === 'dark' ? 'admin-dark' : 'admin-light')
    : baseThemeMode

  const isDark = themeMode === 'dark' || themeMode === 'admin-dark'
  const isAdminTheme = themeMode === 'admin-light' || themeMode === 'admin-dark'

  // Load base theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('baseTheme') as 'light' | 'dark'
      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        setBaseThemeModeState(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
  }, [])

  // Save base theme to localStorage when it changes
  const setThemeMode = (mode: ThemeMode) => {
    const baseMode = mode === 'dark' || mode === 'admin-dark' ? 'dark' : 'light'
    setBaseThemeModeState(baseMode)
    try {
      localStorage.setItem('baseTheme', baseMode)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  const setIsDark = (dark: boolean) => {
    setBaseThemeModeState(dark ? 'dark' : 'light')
    try {
      localStorage.setItem('baseTheme', dark ? 'dark' : 'light')
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