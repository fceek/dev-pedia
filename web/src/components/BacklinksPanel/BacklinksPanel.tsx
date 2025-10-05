'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { BacklinkSummary } from '@/types/graph'
import styles from './BacklinksPanel.module.css'

interface BacklinksPanelProps {
  articleId: string
  sourceType: 'doc' | 'git'
  className?: string
}

export default function BacklinksPanel({
  articleId,
  sourceType,
  className = ''
}: BacklinksPanelProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()

  const [backlinks, setBacklinks] = useState<BacklinkSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchBacklinks = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = user?.token
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${sourceType}/${articleId}/backlinks`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch backlinks')
        }

        const data = await response.json()
        setBacklinks(data.backlinks || [])
      } catch (err) {
        console.error('Failed to fetch backlinks:', err)
        setError(err instanceof Error ? err.message : 'Failed to load backlinks')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBacklinks()
  }, [articleId, sourceType, user])

  const handleBacklinkClick = (backlink: BacklinkSummary) => {
    router.push(`/article/${backlink.source_article_type}/${backlink.source_article_id}`)
  }

  if (isLoading) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
        <div className={styles.header}>
          <h3>Backlinks</h3>
          <span className={styles.count}>...</span>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
        <div className={styles.header}>
          <h3>Backlinks</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    )
  }

  if (backlinks.length === 0) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
        <div className={styles.header}>
          <h3>Backlinks</h3>
          <span className={styles.count}>0</span>
        </div>
        <div className={styles.empty}>No articles link to this page</div>
      </div>
    )
  }

  const displayedBacklinks = isExpanded ? backlinks : backlinks.slice(0, 5)

  return (
    <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
      <div className={styles.header}>
        <h3>Backlinks</h3>
        <span className={styles.count}>{backlinks.length}</span>
      </div>

      <div className={styles.list}>
        {displayedBacklinks.map((backlink, index) => (
          <div
            key={index}
            className={styles.backlinkItem}
            onClick={() => handleBacklinkClick(backlink)}
          >
            <div className={styles.backlinkTitle}>
              {backlink.source_title}
              <span className={`${styles.level} ${styles[`level${backlink.source_classification}`]}`}>
                L{backlink.source_classification}
              </span>
            </div>
            <div className={styles.backlinkPath}>{backlink.source_path}</div>
            {backlink.context_snippet && (
              <div className={styles.backlinkContext}>
                ...{backlink.context_snippet}...
              </div>
            )}
          </div>
        ))}
      </div>

      {backlinks.length > 5 && (
        <button
          className={styles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : `Show ${backlinks.length - 5} more`}
        </button>
      )}
    </div>
  )
}
