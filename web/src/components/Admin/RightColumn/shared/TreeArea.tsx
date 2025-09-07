'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import TreeSection from './TreeSection'
import styles from './TreeArea.module.css'

interface TreeAreaProps {
  sections: Array<{
    id: string
    content: ReactNode
  }>
  transitionKey: string // Changes when content should transition
}

export default function TreeArea({ sections, transitionKey }: TreeAreaProps) {
  const { isDark, getConditionalClass } = useTheme()
  const [currentKey, setCurrentKey] = useState(transitionKey)
  const [currentSections, setCurrentSections] = useState(sections)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (transitionKey !== currentKey) {
      setIsTransitioning(true)
      
      // Keep old content during fade out, then switch to new content for fade in
      setTimeout(() => {
        setCurrentKey(transitionKey)
        setCurrentSections(sections)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 300)
    } else {
      // Update sections immediately if key hasn't changed (for initial render)
      setCurrentSections(sections)
    }
  }, [transitionKey, currentKey, sections])

  return (
    <div className={`${styles.treeArea} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={`${styles.sectionsContainer} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
        <div className={styles.mainVerticalLine}></div>
        
        {currentSections.map((section) => (
          <TreeSection key={section.id}>
            {section.content}
          </TreeSection>
        ))}
      </div>
    </div>
  )
}