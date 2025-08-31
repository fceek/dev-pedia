'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './IntegrationCard.module.css'

export default function IntegrationCard() {
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [syncStatus, setSyncStatus] = useState<'sync' | 'syncing' | 'synced' | 'error'>('sync')
  
  // Mock data for visual design
  const mockData = {
    isConnected: true,
    accountType: 'organization',
    accountName: 'acme-corp',
    syncedRepos: 23,
    totalRepos: 31,
    lastSync: '2h ago'
  }
  
  if (!user) return null

  const getSyncPercentage = (): number => {
    return Math.round((mockData.syncedRepos / mockData.totalRepos) * 100)
  }

  const getSyncStatus = (): 'low' | 'medium' | 'high' | 'full' => {
    const percentage = getSyncPercentage()
    if (percentage >= 100) return 'full'
    if (percentage >= 75) return 'high'
    if (percentage >= 50) return 'medium'
    return 'low'
  }

  const handleSync = () => {
    if (syncStatus === 'syncing') return
    
    setSyncStatus('syncing')
    
    // Mock sync sequence
    setTimeout(() => {
      // Simulate random success/error for demo
      const success = Math.random() > 0.2 // 80% success rate
      setSyncStatus(success ? 'synced' : 'error')
      
      // Reset to sync state after showing result
      setTimeout(() => {
        setSyncStatus('sync')
      }, 2000)
    }, 2500)
  }

  const getSyncCaption = (): string => {
    switch (syncStatus) {
      case 'sync': return 'Sync'
      case 'syncing': return 'Syncing'
      case 'synced': return 'Synced'
      case 'error': return 'Error'
    }
  }

  const handleConfig = () => {
    console.log('Config clicked')
  }

  return (
    <div className={`${styles.integrationCard} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.cardHeader}>
        <div className={styles.typeLabel}>GITHUB</div>
        <div className={styles.actionButtons}>
          <button
            className={styles.actionButton}
            onClick={handleConfig}
          >
            Config
          </button>
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.connectionSection}>
          <div className={styles.connectionInfo}>
            <div className={styles.fieldLabel}>CONNECTION</div>
            {mockData.isConnected ? (
              <div className={styles.connectedInfo}>
                <div className={styles.accountInfo}>
                  <span className={styles.accountType}>
                    {mockData.accountType.toUpperCase()}
                  </span>
                  <span className={styles.accountName}>
                    {mockData.accountName}
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.fieldValue}>Not Connected</div>
            )}
          </div>
          
          <div className={styles.indicatorContainer}>
            <div 
              className={`${styles.statusIndicator} ${styles[syncStatus]}`}
              onClick={handleSync}
              title="Sync Repositories"
            >
              <div className={styles.indicatorCore}></div>
              <div className={styles.indicatorGlow}></div>
            </div>
            <div className={styles.indicatorCaption}>
              {getSyncCaption()}
            </div>
          </div>
        </div>
        
        {mockData.isConnected && (
          <>
            <div className={styles.syncSection}>
              <div className={styles.fieldLabel}>REPOSITORY SYNC</div>
              <div className={styles.syncStats}>
                <span className={styles.syncedCount}>{mockData.syncedRepos}</span>
                <span className={styles.separator}>/</span>
                <span className={styles.totalCount}>{mockData.totalRepos}</span>
              </div>
            </div>
            
            
            <div className={styles.lastSyncSection}>
              <div className={styles.fieldLabel}>LAST SYNC</div>
              <div className={styles.fieldValue}>{mockData.lastSync}</div>
            </div>
          </>
        )}
      </div>
      
      {mockData.isConnected && (
        <div className={styles.pieChartContainer}>
          <svg className={styles.pieChart} viewBox="0 0 42 42">
            <circle
              className={styles.pieBackground}
              cx="21" cy="21" r="15.915"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              className={`${styles.pieFill} ${styles[getSyncStatus()]}`}
              cx="21" cy="21" r="15.915"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${getSyncPercentage()} ${100 - getSyncPercentage()}`}
              strokeDashoffset="25"
              transform="rotate(-90 21 21)"
            />
            <text
              className={styles.pieText}
              x="21" y="21"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {getSyncPercentage()}%
            </text>
          </svg>
          <div className={styles.pieCaption}>Coverage</div>
        </div>
      )}
    </div>
  )
}