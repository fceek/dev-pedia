'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './TokenCard.module.css'

interface TokenStats {
  created: number
  maxAllowed: number
}

export default function TokenCard() {
  const { user, classificationLevel, loadTokenStats } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [tokenStats, setTokenStats] = useState<TokenStats>({ created: 0, maxAllowed: 0 })
  const [loading, setLoading] = useState(true)
  
  // Load token statistics when component mounts
  useEffect(() => {
    if (user && user.token !== 'guest') {
      loadStats()
    }
  }, [user?.token, loadTokenStats])
  
  if (!user) return null

  const loadStats = async () => {
    try {
      setLoading(true)
      const stats = await loadTokenStats()
      
      if (stats) {
        setTokenStats({ created: stats.created, maxAllowed: stats.maxAllowed })
      } else {
        throw new Error('Failed to load token statistics from backend')
      }
    } catch (error) {
      console.error('Failed to load token stats:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }


  const getProgressPercentage = (): number => {
    if (tokenStats.maxAllowed === 0 || tokenStats.maxAllowed === -1) return 0
    return Math.min((tokenStats.created / tokenStats.maxAllowed) * 100, 100)
  }

  const getProgressStatus = (): 'low' | 'medium' | 'high' | 'full' => {
    const percentage = getProgressPercentage()
    if (percentage >= 100) return 'full'
    if (percentage >= 75) return 'high'
    if (percentage >= 50) return 'medium'
    return 'low'
  }

  const handleCreateToken = () => {
    // TODO: Implement create token modal/view
    console.log('Create token clicked')
  }

  const handleListTokens = () => {
    // TODO: Implement list tokens view
    console.log('List tokens clicked')
  }

  return (
    <div className={`${styles.tokenCard} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.cardHeader}>
        <div className={styles.typeLabel}>TOKENS</div>
        <div className={styles.actionButtons}>
          <button
              className={styles.actionButton}
              onClick={handleCreateToken}
              disabled={tokenStats.maxAllowed !== -1 && tokenStats.created >= tokenStats.maxAllowed}
          >
              Create
          </button>
          <button
              className={styles.actionButton}
              onClick={handleListTokens}
          >
              List
          </button>
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.statsSection}>
          <div className={styles.fieldLabel}>CREATED TOKENS</div>
          <div className={styles.statsDisplay}>
            <span className={styles.currentCount}>{loading ? '...' : tokenStats.created}</span>
            <span className={styles.separator}>/</span>
            <span className={styles.maxCount}>
              {loading ? '...' : (tokenStats.maxAllowed === -1 ? 'Unlimited' : tokenStats.maxAllowed)}
            </span>
          </div>
        </div>
        
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>CAPACITY</div>
          <div className={styles.progressContainer}>
            <div className={styles.progressTrack}>
              <div 
                className={`${styles.progressFill} ${styles[getProgressStatus()]}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {Math.round(getProgressPercentage())}%
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}