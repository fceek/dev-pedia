'use client'

import styles from './LargeGlow.module.css'
import { useTheme } from '@/contexts/ThemeContext'

export default function LargeGlow() {
  const { isDark, isFlashing } = useTheme()
  
  return (
    <div className={`${styles.largeGlow} ${isFlashing ? styles.flash : (isDark ? styles.dark : '')}`} />
  )
}