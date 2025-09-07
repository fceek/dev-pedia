'use client'

import { useState, ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import BuildGlow from '../BuildGlow/BuildGlow'
import styles from './Layout.module.css'

interface LayoutProps {
  leftColumn: ReactNode
  rightColumn?: ReactNode
  breadcrumbs?: string[]
  classificationLevel?: number // Optional override, otherwise uses auth context
  author?: string
  year?: number
  isExpanded?: boolean
  onExpandToggle?: (expanded: boolean) => void
  gridRatio?: string // e.g., "4fr 1fr", "2fr 1fr", "3fr 2fr"
  onBreadcrumbClick?: (item: string) => void
}

export default function Layout({ 
  leftColumn,
  rightColumn,
  breadcrumbs,
  classificationLevel: propClassificationLevel,
  author,
  year,
  isExpanded: externalIsExpanded,
  onExpandToggle,
  gridRatio = "4fr 1fr",
  onBreadcrumbClick
}: LayoutProps) {
  const { classificationLevel: authClassificationLevel } = useAuth()
  const { isDark, isFlashing, setIsDark, handleLightOn, isAdminTheme, getThemeClasses, getConditionalClass } = useTheme()
  const [internalIsExpanded, setInternalIsExpanded] = useState(false)
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded
  
  // Use prop override or auth context level
  const classificationLevel = propClassificationLevel ?? authClassificationLevel

  return (
    <div 
      className={`${styles.container} ${getThemeClasses(styles)} ${getConditionalClass(styles, 'expanded', isExpanded)} ${getConditionalClass(styles, 'nonAdmin', !isAdminTheme)}`}
      style={{ gridTemplateColumns: gridRatio }}
    >
      <BuildGlow />
      <Header 
        breadcrumbs={breadcrumbs}
        classificationLevel={classificationLevel}
        isExpanded={isExpanded}
        onBreadcrumbClick={onBreadcrumbClick}
      />
      
      <main className={styles.leftColumn}>
        {leftColumn}
      </main>
      
      {rightColumn && (
        <div className={styles.rightColumn}>
          {rightColumn}
        </div>
      )}
      
      <Footer 
        author={author} 
        year={year}
        isDark={isDark}
        onLightToggle={setIsDark}
        onLightFlash={handleLightOn}
        isExpanded={isExpanded}
      />
    </div>
  )
}