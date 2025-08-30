'use client'

import styles from './Footer.module.css'

interface FooterProps {
  author?: string
  year?: number
  isDark: boolean
  onLightToggle: (isDark: boolean) => void
  onLightFlash: () => void
  isExpanded?: boolean
}

export default function Footer({ 
  author = 'Fceek@London',
  year = 2025,
  isDark,
  onLightToggle,
  onLightFlash,
  isExpanded = false
}: FooterProps) {
  
  return (
    <footer className={`${styles.footer} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.footerLeft}>
        <span>{author} | {year}</span>
      </div>
      <div className={styles.footerRight}>
        <div className={styles.toggleGroup}>
          <span>Lights:</span>
          <div className={styles.toggleContainer}>
            <button
              className={`${styles.toggleButton} ${!isDark ? styles.active : ''}`}
              onClick={onLightFlash}
            >
              On
            </button>
            <button
              className={`${styles.toggleButton} ${isDark ? styles.active : ''}`}
              onClick={() => onLightToggle(true)}
            >
              Off
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}