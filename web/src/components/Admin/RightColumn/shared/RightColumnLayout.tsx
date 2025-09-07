'use client'

import { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import TreeArea from './TreeArea'
import QuickActionArea from './QuickActionArea'
import styles from './RightColumnLayout.module.css'

interface RightColumnLayoutProps {
  treeSections: Array<{
    id: string
    content: ReactNode
  }>
  bottomContent?: ReactNode
  transitionKey: string // Used by areas to know when to transition
}

export default function RightColumnLayout({ treeSections, bottomContent, transitionKey }: RightColumnLayoutProps) {
  const { isDark, getConditionalClass } = useTheme()

  return (
    <div className={`${styles.rightColumnLayout} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <TreeArea 
        sections={treeSections}
        transitionKey={transitionKey}
      />
      
      {bottomContent && (
        <QuickActionArea
          transitionKey={transitionKey}
        >
          {bottomContent}
        </QuickActionArea>
      )}
    </div>
  )
}