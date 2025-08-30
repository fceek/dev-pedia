'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './QuickActions.module.css'

export default function QuickActions() {
  const { isDark, getConditionalClass } = useTheme()

  return (
    <div className={`${styles.quickActions} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>QUICK ACTIONS</div>
      <div className={styles.list}>
        <div className={styles.placeholder}>
          Actions to be defined
        </div>
      </div>
    </div>
  )
}