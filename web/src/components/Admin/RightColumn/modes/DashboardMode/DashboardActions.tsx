'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './DashboardActions.module.css'

export default function DashboardActions() {
  const { isDark, getConditionalClass } = useTheme()

  return (
    <div className={`${styles.dashboardActions} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>QUICK ACTIONS</div>
      <div className={styles.list}>
        <div className={styles.placeholder}>
          Dashboard actions to be defined
        </div>
      </div>
    </div>
  )
}