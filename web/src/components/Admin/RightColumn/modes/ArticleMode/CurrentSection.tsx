'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './CurrentSection.module.css'

interface CurrentSectionProps {
  data?: {
    content?: string
    cursorPosition?: number
    title?: string
  }
}

export default function CurrentSection({ data }: CurrentSectionProps) {
  const { isDark, getConditionalClass } = useTheme()

  // Extract current heading section from markdown content based on cursor position
  const getCurrentHeading = () => {
    const content = data?.content || ''
    const cursorPos = data?.cursorPosition || 0
    
    // Find all headings in the content
    const headings = []
    const lines = content.split('\n')
    let charCount = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
      
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2]
        headings.push({
          level,
          text,
          position: charCount
        })
      }
      
      charCount += line.length + 1 // +1 for newline
      
      // Stop if we've passed the cursor position
      if (charCount > cursorPos) break
    }
    
    // Find the current heading (last heading before cursor)
    const currentHeading = headings.reverse().find(h => h.position <= cursorPos)
    
    return currentHeading || { level: 0, text: data?.title || 'Document Root' }
  }

  const currentHeading = getCurrentHeading()

  return (
    <div className={`${styles.currentSection} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>{currentHeading.text.toUpperCase()}</div>
      <div className={styles.list}>
        <div className={styles.listItem}>
          <span className={styles.label}>Level:</span>
          <span className={styles.value}>H{currentHeading.level || 1}</span>
        </div>
      </div>
    </div>
  )
}