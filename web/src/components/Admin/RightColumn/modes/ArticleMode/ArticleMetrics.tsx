'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './ArticleMetrics.module.css'

interface ArticleMetricsProps {
  data?: {
    content?: string
    secrets?: Array<{ key: string; content: string; classificationLevel: number }>
  }
}

export default function ArticleMetrics({ data }: ArticleMetricsProps) {
  const { isDark, getConditionalClass } = useTheme()

  const content = data?.content || ''
  const secrets = data?.secrets || []

  // Calculate word count (excluding secret placeholders)
  const getWordCount = () => {
    const textWithoutSecrets = content.replace(/\{\{SECRET:[^}]+\}\}/g, '')
    return textWithoutSecrets.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  // Calculate secret count
  const getSecretCount = () => {
    return secrets.length
  }

  // Calculate approximate read time (average 200 words per minute)
  const getReadTime = () => {
    const wordCount = getWordCount()
    const minutes = Math.ceil(wordCount / 200)
    return minutes === 1 ? '1 min' : `${minutes} min`
  }

  return (
    <div className={`${styles.articleMetrics} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>METRICS</div>
      <div className={styles.list}>
        <div className={styles.listItem}>
          <span className={styles.label}>Words:</span>
          <span className={styles.value}>{getWordCount()}</span>
        </div>
        <div className={styles.listItem}>
          <span className={styles.label}>Secrets:</span>
          <span className={styles.value}>{getSecretCount()}</span>
        </div>
        <div className={styles.listItem}>
          <span className={styles.label}>Read time:</span>
          <span className={styles.value}>{getReadTime()}</span>
        </div>
      </div>
    </div>
  )
}