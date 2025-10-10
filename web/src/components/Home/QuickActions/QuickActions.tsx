'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './QuickActions.module.css'

interface QuickActionsProps {
  onSearchFocus?: () => void
}

export default function QuickActions({ onSearchFocus }: QuickActionsProps) {
  const router = useRouter()
  const { isDark, getConditionalClass } = useTheme()

  const handleGraphView = () => {
    router.push('/graph')
  }

  const handleSearch = () => {
    if (onSearchFocus) {
      onSearchFocus()
    }
  }

  return (
    <div className={`${styles.quickActions} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>QUICK ACTIONS</div>
      <div className={styles.actionsList}>
        <button className={styles.actionButton} onClick={handleGraphView}>
          Graph View
        </button>
        <button className={styles.actionButton} onClick={handleSearch}>
          Search Articles
        </button>
      </div>
    </div>
  )
}
