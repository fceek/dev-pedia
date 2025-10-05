'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { BrokenLink, GetBrokenLinksResponse } from '@/types/graph'
import styles from './BrokenLinksPanel.module.css'

interface BrokenLinksPanelProps {
  articleId: string
  sourceType: 'doc' | 'git'
}

export default function BrokenLinksPanel({ articleId, sourceType }: BrokenLinksPanelProps) {
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBrokenLinks = async () => {
      if (!user?.token || !articleId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${sourceType}/${articleId}/broken-links`,
          {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch broken links')
        }

        const data: GetBrokenLinksResponse = await response.json()
        setBrokenLinks(data.broken_links || [])
      } catch (err) {
        console.error('Error fetching broken links:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBrokenLinks()
  }, [articleId, sourceType, user])

  if (isLoading) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
        <h3 className={styles.header}>Broken Links</h3>
        <div className={styles.loading}>Loading broken links...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
        <h3 className={styles.header}>Broken Links</h3>
        <div className={styles.error}>Error: {error}</div>
      </div>
    )
  }

  if (brokenLinks.length === 0) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
        <h3 className={styles.header}>Broken Links</h3>
        <div className={styles.empty}>No broken links found</div>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <h3 className={styles.header}>
        Broken Links <span className={styles.count}>({brokenLinks.length})</span>
      </h3>

      <div className={styles.linksList}>
        {brokenLinks.map((link, index) => (
          <div key={index} className={styles.linkItem}>
            <div className={styles.linkText}>{link.link_text}</div>
            <div className={styles.targetPath}>→ {link.target_path}</div>
            <div className={styles.reason}>{link.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
