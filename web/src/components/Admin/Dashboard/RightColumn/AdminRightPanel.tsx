'use client'

import { useTheme } from '@/contexts/ThemeContext'
import ProjectInfo from './ProjectInfo/ProjectInfo'
import OrganizationInfo from './OrganizationInfo/OrganizationInfo'
import QuickActions from './QuickActions/QuickActions'
import styles from './AdminRightPanel.module.css'

export default function AdminRightPanel() {
  const { isDark, getConditionalClass } = useTheme()

  return (
    <div className={`${styles.adminRightPanel} ${getConditionalClass(styles, 'dark', isDark)}`}>
      {/* Vertical line connecting from header */}
      <div className={styles.treeContainer}>
        <div className={styles.mainVerticalLine}></div>
        
        {/* Project Info Branch */}
        <div className={styles.branchContainer}>
          <div className={styles.horizontalBranch}></div>
          <div className={styles.treeContent}>
            <ProjectInfo />
          </div>
        </div>
        
        {/* Organization Info Branch */}
        <div className={styles.branchContainer}>
          <div className={styles.horizontalBranch}></div>
          <div className={styles.treeContent}>
            <OrganizationInfo />
          </div>
        </div>
      </div>
      
      {/* Quick Actions separate from tree */}
      <div className={styles.separateContent}>
        <QuickActions />
      </div>
    </div>
  )
}