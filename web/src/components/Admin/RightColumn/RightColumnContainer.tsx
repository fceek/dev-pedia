'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import TreeArea from './shared/TreeArea'
import QuickActionArea from './shared/QuickActionArea'
import ProjectInfo from './modes/DashboardMode/ProjectInfo/ProjectInfo'
import OrganizationInfo from './modes/DashboardMode/OrganizationInfo/OrganizationInfo'
import DashboardActions from './modes/DashboardMode/DashboardActions'
import CurrentSection from './modes/ArticleMode/CurrentSection'
import ArticleMetrics from './modes/ArticleMode/ArticleMetrics'
import ArticleActions from './modes/ArticleMode/ArticleActions'
import styles from './RightColumnContainer.module.css'

import { AdminMode } from '@/app/admin/page'

interface RightColumnContainerProps {
  mode: AdminMode
  data?: any
  isImmersive?: boolean
  onImmersiveToggle?: (immersive: boolean) => void
  previewMode?: boolean
  onPreviewToggle?: (preview: boolean) => void
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onMakeSecret?: (level: number) => void
  onFormat?: (format: string) => void
  activeFormats?: any
  currentClassificationLevel?: number | null
  selectedBlockCount?: number
  onDeleteSelectedBlocks?: () => void
}

export default function RightColumnContainer({ mode, data, isImmersive, onImmersiveToggle, previewMode, onPreviewToggle, status, onStatusChange, onMakeSecret, onFormat, activeFormats, currentClassificationLevel, selectedBlockCount, onDeleteSelectedBlocks }: RightColumnContainerProps) {
  const { isDark, getConditionalClass } = useTheme()

  const getTreeSections = () => {
    switch (mode) {
      case 'article':
        return [
          { id: 'current-section', content: <CurrentSection data={data} /> },
          { id: 'metrics', content: <ArticleMetrics data={data} /> }
        ]
      case 'dashboard':
      default:
        return [
          { id: 'project', content: <ProjectInfo /> },
          { id: 'organization', content: <OrganizationInfo /> }
        ]
    }
  }

  const getQuickActions = () => {
    switch (mode) {
      case 'article':
        return (
          <ArticleActions
            isPreview={previewMode}
            onPreviewToggle={onPreviewToggle}
            isImmersive={isImmersive}
            onImmersiveToggle={onImmersiveToggle}
            status={status}
            onStatusChange={onStatusChange}
            onMakeSecret={onMakeSecret}
            onFormat={onFormat}
            activeFormats={activeFormats}
            currentClassificationLevel={currentClassificationLevel}
            selectedBlockCount={selectedBlockCount}
            onDeleteSelectedBlocks={onDeleteSelectedBlocks}
          />
        )
      case 'dashboard':
      default:
        return <DashboardActions />
    }
  }

  return (
    <div className={`${styles.rightColumnContainer} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <TreeArea 
        sections={getTreeSections()}
        transitionKey={mode}
      />
      
      <QuickActionArea transitionKey={mode}>
        {getQuickActions()}
      </QuickActionArea>
    </div>
  )
}