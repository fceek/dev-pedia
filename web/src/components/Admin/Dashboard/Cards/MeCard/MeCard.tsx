'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './MeCard.module.css'

interface CardProps {
  isExpanded?: boolean
  isPushedAway?: boolean
}

export default function MeCard({ isExpanded = false, isPushedAway = false }: CardProps) {
  const { user, classificationLevel, loadUserDetails } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [copied, setCopied] = useState(false)
  
  // Load detailed user information when component mounts
  useEffect(() => {
    if (user && !user.name) {
      loadUserDetails()
    }
  }, [user?.token, loadUserDetails])
  
  if (!user) return null

  const formatTimeLeft = (expiresAt?: string) => {
    if (!expiresAt) return 'No expiration'
    
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const getCreatedBy = () => {
    // Use the resolved creator name if available
    if (user.createdByName) return user.createdByName
    // Fallback to GOD if no creator info
    return 'GOD'
  }

  const handleCopyToken = () => {
    navigator.clipboard.writeText(user.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`${styles.meCard} ${getConditionalClass(styles, 'dark', isDark)} ${getConditionalClass(styles, 'pushedAway', isPushedAway)}`}>
      <div className={styles.cardHeader}>
        <div className={styles.typeLabel}>ME</div>
        <div className={styles.levelIndicator}>
          LEVEL {classificationLevel}
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.nameSection}>
          <div className={styles.fieldLabel}>NAME</div>
          <div className={styles.fieldValue}>{user.name || 'Unknown User'}</div>
        </div>
        
        <div className={styles.expirySection}>
          <div className={styles.fieldLabel}>EXPIRES</div>
          <div className={styles.fieldValue}>{formatTimeLeft(user.expiresAt)}</div>
        </div>
        
        <div className={styles.creatorSection}>
          <div className={styles.fieldLabel}>CREATED BY</div>
          <div className={styles.fieldValue}>{getCreatedBy()}</div>
        </div>
      </div>
      
      <div className={styles.cardFooter}>
        <div className={styles.serialNumber}>#{user.token.substring(0, 8).toUpperCase()}</div>
        <button
          className={styles.copyButton}
          onClick={handleCopyToken}
        >
          {copied ? 'Copied' : 'Copy Token'}
        </button>
      </div>
      
      <div className={styles.stamp}>CLASSIFIED</div>
      
      {/* Pushed Away Visual Hint */}
      {isPushedAway && (
        <div className={styles.pushedHint}>
          <div className={styles.hintLabel}>ME</div>
        </div>
      )}
    </div>
  )
}