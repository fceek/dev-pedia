'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './OrganizationInfo.module.css'

interface OrganizationStats {
  totalTokens: number
  totalArticles: number
}

export default function OrganizationInfo() {
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [orgStats, setOrgStats] = useState<OrganizationStats>({ totalTokens: 0, totalArticles: 0 })
  const [loading, setLoading] = useState(true)
  
  // Load organization statistics when component mounts
  useEffect(() => {
    if (user && user.token !== 'guest') {
      loadOrgStats()
    }
  }, [user?.token])
  
  if (!user) return null

  const loadOrgStats = async () => {
    try {
      setLoading(true)
      // TODO: Implement loadOrganizationStats API call
      // const stats = await loadOrganizationStats()
      
      // Mock data for now
      setOrgStats({
        totalTokens: 127,
        totalArticles: 342
      })
    } catch (error) {
      console.error('Failed to load organization stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.organizationInfo} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>ORGANIZATION</div>
      <div className={styles.list}>
        <div className={styles.listItem}>
          <span className={styles.label}>Name:</span>
          <span className={styles.value}>My Little Doc</span>
        </div>
        <div className={styles.listItem}>
          <span className={styles.label}>Tokens:</span>
          <span className={styles.value}>{loading ? '...' : orgStats.totalTokens}</span>
        </div>
        <div className={styles.listItem}>
          <span className={styles.label}>Knowledge:</span>
          <span className={styles.value}>{loading ? '...' : orgStats.totalArticles}</span>
        </div>
      </div>
    </div>
  )
}