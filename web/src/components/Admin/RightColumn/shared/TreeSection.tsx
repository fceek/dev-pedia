'use client'

import { ReactNode } from 'react'
import styles from './TreeSection.module.css'

interface TreeSectionProps {
  children: ReactNode
}

export default function TreeSection({ children }: TreeSectionProps) {
  return (
    <div className={styles.branchContainer}>
      <div className={styles.horizontalBranch}></div>
      <div className={styles.treeContent}>
        {children}
      </div>
    </div>
  )
}