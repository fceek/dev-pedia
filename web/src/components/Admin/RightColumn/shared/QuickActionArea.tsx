'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './QuickActionArea.module.css'

interface QuickActionAreaProps {
  children: ReactNode
  transitionKey: string // Changes when content should transition
}

export default function QuickActionArea({ children, transitionKey }: QuickActionAreaProps) {
  const { isDark, getConditionalClass } = useTheme()
  const [currentKey, setCurrentKey] = useState(transitionKey)
  const [currentContent, setCurrentContent] = useState(children)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (transitionKey !== currentKey) {
      setIsTransitioning(true)
      
      // Keep old content during fade out, then switch to new content for fade in
      setTimeout(() => {
        setCurrentKey(transitionKey)
        setCurrentContent(children)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 300)
    } else {
      // Update content immediately if key hasn't changed (for initial render)
      setCurrentContent(children)
    }
  }, [transitionKey, currentKey, children])

  return (
    <div className={`${styles.quickActionArea} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={`${styles.content} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
        {currentContent}
      </div>
    </div>
  )
}