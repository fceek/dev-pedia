'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './ProjectInfo.module.css'

export default function ProjectInfo() {
  const { isDark, getConditionalClass } = useTheme()

  const handleGithubClick = () => {
    window.open('https://github.com/fceek/dev-pedia', '_blank')
  }

  return (
    <div className={`${styles.projectInfo} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>&#123;DEV&#125; Pedia</div>
      <div className={styles.list}>
        <div className={styles.listItem}>
          <span className={styles.label}>Version:</span>
          <span className={styles.value}>v0.1.0</span>
        </div>
        <div className={styles.listItem}>
          <span className={styles.label}>Repository:</span>
          <button className={styles.link} onClick={handleGithubClick}>
            GitHub
          </button>
        </div>
      </div>
    </div>
  )
}