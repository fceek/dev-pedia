'use client'

import NavList from '@/components/Right/Navigation/NavList/NavList'
import TOC from '@/components/Right/Navigation/TOC/TOC'
import styles from './Navigation.module.css'

interface NavItem {
  title: string
  href?: string
}

interface TOCItem {
  title: string
  level: number
  href?: string
}

interface NavigationProps {
  navItems?: NavItem[]
  tocItems?: TOCItem[]
  activeNavIndex?: number
  onNavItemClick?: (index: number) => void
  onTocItemClick?: (index: number) => void
  isExpanded?: boolean
  includeImmersiveToggle?: (include: boolean) => void
}

export default function Navigation({ 
  navItems = [], 
  tocItems = [], 
  activeNavIndex = 0,
  onNavItemClick,
  onTocItemClick,
  isExpanded = false,
  includeImmersiveToggle
}: NavigationProps) {
  return (
    <div className={styles.navigation}>
      <div className={styles.navContent}>
        {navItems.length > 0 && (
          <NavList 
            items={navItems}
            activeIndex={activeNavIndex}
            onItemClick={onNavItemClick}
          />
        )}
        
        {tocItems.length > 0 && (
          <TOC 
            items={tocItems}
            onItemClick={onTocItemClick}
          />
        )}
      </div>
      
      {includeImmersiveToggle && (
        <div className={styles.toggleGroup}>
          <span>Immersive:</span>
          <div className={styles.toggleContainer}>
            <button
              className={`${styles.toggleButton} ${isExpanded ? styles.active : ''}`}
              onClick={() => includeImmersiveToggle(true)}
            >
              On
            </button>
            <button
              className={`${styles.toggleButton} ${!isExpanded ? styles.active : ''}`}
              onClick={() => includeImmersiveToggle(false)}
            >
              Off
            </button>
          </div>
        </div>
      )}
    </div>
  )
}