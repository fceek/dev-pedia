'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './ArticleCard.module.css'

interface ArticleStats {
  created: number
  contributions: number
  totalViews: number
  drafts: number
  lastContributionDays: number
}

export default function ArticleCard() {
  const { user, classificationLevel, loadArticleStats } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [articleStats, setArticleStats] = useState<ArticleStats>({
    created: 0,
    contributions: 0,
    totalViews: 0,
    drafts: 0,
    lastContributionDays: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Load article statistics when component mounts
  useEffect(() => {
    if (user && user.token !== 'guest') {
      loadStats()
    }
  }, [user?.token])
  
  if (!user) return null

  const loadStats = async () => {
    try {
      setLoading(true)
      // TODO: Implement loadArticleStats in AuthContext
      // const stats = await loadArticleStats()
      // 
      // if (stats) {
      //   setArticleStats(stats)
      // } else {
      //   throw new Error('Failed to load article statistics from backend')
      // }
      
      // Mock data for now
      setArticleStats({
        created: 12,
        contributions: 47,
        totalViews: 2847,
        drafts: 3,
        lastContributionDays: 2
      })
    } catch (error) {
      console.error('Failed to load article stats:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }


  const getRecentActivity = (): string => {
    if (articleStats.lastContributionDays === 0) return 'Today'
    if (articleStats.lastContributionDays === 1) return 'Yesterday'
    return `${articleStats.lastContributionDays} days ago`
  }

  const handleCreateArticle = () => {
    // TODO: Implement create article modal/view
    console.log('Create article clicked')
  }

  const handleListArticles = () => {
    // TODO: Implement list articles view
    console.log('List articles clicked')
  }

  const handleViewDrafts = () => {
    // TODO: Implement view drafts view
    console.log('View drafts clicked')
  }

  return (
    <div className={`${styles.articleCard} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.cardHeader}>
        <div className={styles.typeLabel}>ARTICLES</div>
        <div className={styles.actionButtons}>
          <button
              className={styles.actionButton}
              onClick={handleCreateArticle}
          >
              Create
          </button>
          <button
              className={styles.actionButton}
              onClick={handleListArticles}
          >
              List
          </button>
          <button
              className={styles.actionButton}
              onClick={handleViewDrafts}
              disabled={articleStats.drafts === 0}
          >
              Drafts
          </button>
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.fieldLabel}>CREATED</div>
            <div className={styles.fieldValue}>{loading ? '...' : articleStats.created}</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.fieldLabel}>CONTRIBUTIONS</div>
            <div className={styles.fieldValue}>{loading ? '...' : articleStats.contributions}</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.fieldLabel}>TOTAL VIEWS</div>
            <div className={styles.fieldValue}>{loading ? '...' : formatViews(articleStats.totalViews)}</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.fieldLabel}>DRAFTS</div>
            <div className={styles.fieldValue}>{loading ? '...' : articleStats.drafts}</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.fieldLabel}>RECENT</div>
            <div className={styles.fieldValue}>{loading ? '...' : getRecentActivity()}</div>
          </div>
        </div>
      </div>

    </div>
  )
}