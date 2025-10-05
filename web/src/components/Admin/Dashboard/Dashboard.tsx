'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { AdminMode } from '@/app/admin/page'
import MeCard from './Cards/MeCard/MeCard'
import TokenCard from './Cards/TokenCard/TokenCard'
import ArticleCard from './Cards/ArticleCard/ArticleCard'
import IntegrationCard from './Cards/IntegrationCard/IntegrationCard'
import RepoCard from './Cards/RepoCard/RepoCard'
import ArticleEditor from '@/components/Editor/ArticleEditor'
import styles from './Dashboard.module.css'

type ExpandedCard = 'article' | 'me' | 'token' | 'integration' | 'repo' | null

interface DashboardProps {
  mode: AdminMode
  isImmersive?: boolean
  onImmersiveToggle?: (immersive: boolean) => void
  previewMode?: boolean
  onPreviewToggle?: (preview: boolean) => void
  onMakeSecret?: (makeSecretFn: (level: number) => void) => void
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onModeChange?: (mode: AdminMode) => void
  onFormat?: (formatFn: (format: string) => void) => void
  onActiveFormatsChange?: (formats: any) => void
  onClassificationLevelChange?: (level: number | null) => void
  onSelectedBlocksChange?: (count: number) => void
  onDeleteBlocksAction?: (deleteFn: () => void) => void
}

export default function Dashboard({ mode, isImmersive = false, onImmersiveToggle, previewMode = false, onPreviewToggle, onMakeSecret, status, onStatusChange, onModeChange, onFormat, onActiveFormatsChange, onClassificationLevelChange, onSelectedBlocksChange, onDeleteBlocksAction }: DashboardProps) {
  const { isDark, getConditionalClass } = useTheme()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isCardsFadingIn, setIsCardsFadingIn] = useState(false)

  const handleExpandCard = (cardType: ExpandedCard) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    
    // Quick fade out, then immediately switch to expanded mode
    setTimeout(() => {
      if (cardType && cardType !== 'me' && onModeChange) {
        onModeChange(cardType as AdminMode) // Convert card type to admin mode
      }
    }, 150) // Fast fade out
    
    // Complete transition - much faster
    setTimeout(() => {
      setIsTransitioning(false)
    }, 400) // Total 400ms
  }

  const handleCollapseCard = () => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setIsFadingOut(true)
    
    // Switch to dashboard after fade out
    setTimeout(() => {
      if (onModeChange) {
        onModeChange('dashboard')
      }
      setIsFadingOut(false)
      setIsCardsFadingIn(true)
    }, 150) // Fade out duration
    
    // Complete transition after cards fade in
    setTimeout(() => {
      setIsTransitioning(false)
      setIsCardsFadingIn(false)
    }, 400) // Total transition time
  }

  const handleTabSwitch = (cardType: ExpandedCard) => {
    if (isTransitioning || mode === 'dashboard') return
    
    setIsTransitioning(true)
    if (cardType && onModeChange) {
      onModeChange(cardType as AdminMode)
    }
    
    // Quick content swap
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }

  const handleReturnToDashboard = () => {
    handleCollapseCard()
  }

  const handleSaveArticle = async (articleData: any) => {
    // TODO: Implement save logic
    console.log('Saving article:', articleData)
    // Stay in expanded mode after save
  }

  const renderDashboardMode = () => (
    <div className={`${styles.cardsGrid} ${getConditionalClass(styles, 'fading', isTransitioning && mode === 'dashboard')} ${getConditionalClass(styles, 'fadingIn', isCardsFadingIn)}`}>
      <MeCard 
        onExpand={() => handleExpandCard('me')}
      />
      <TokenCard 
        onExpand={() => handleExpandCard('token')}
      />
      <ArticleCard 
        onExpand={() => handleExpandCard('article')}
      />
      <IntegrationCard 
        onExpand={() => handleExpandCard('integration')}
      />
      <RepoCard 
        onExpand={() => handleExpandCard('repo')}
      />
    </div>
  )

  const renderExpandedMode = () => (
    <div className={`${styles.expandedMode} ${isFadingOut ? styles.fadingOut : ''}`}>
      {/* Left margin tabs */}
      <div className={styles.tabsContainer}>
        <button 
          className={styles.closeTab}
          onClick={handleReturnToDashboard}
          title="Back to Dashboard"
        >
          ×
        </button>
        
        <button 
          className={`${styles.tab} ${mode === 'me' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('me')}
        >
          ME
        </button>
        
        <button 
          className={`${styles.tab} ${mode === 'token' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('token')}
        >
          TOKENS
        </button>
        
        <button 
          className={`${styles.tab} ${mode === 'article' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('article')}
        >
          ARTICLES
        </button>
        
        <button 
          className={`${styles.tab} ${mode === 'integration' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('integration')}
        >
          INTEGRATIONS
        </button>
        
        <button 
          className={`${styles.tab} ${mode === 'repo' ? styles.active : ''}`}
          onClick={() => handleTabSwitch('repo')}
        >
          REPOS
        </button>
      </div>
      
      {/* Expanded card content area */}
      <div className={`${styles.expandedContent} ${mode === 'article' ? styles.editorMode : styles.cardMode}`}>
        {mode === 'me' && <MeCard isExpanded={true} />}
        {mode === 'token' && <TokenCard isExpanded={true} />}
        {mode === 'article' && (
          <ArticleEditor
            onSave={handleSaveArticle}
            onCancel={handleReturnToDashboard}
            className={styles.editorInExpanded}
            isImmersive={isImmersive}
            onImmersiveToggle={onImmersiveToggle}
            previewMode={previewMode}
            onPreviewToggle={onPreviewToggle}
            onMakeSecret={onMakeSecret}
            status={status}
            onStatusChange={onStatusChange}
            onFormat={onFormat}
            onActiveFormatsChange={onActiveFormatsChange}
            onClassificationLevelChange={onClassificationLevelChange}
            onSelectedBlocksChange={onSelectedBlocksChange}
            onDeleteBlocksAction={onDeleteBlocksAction}
          />
        )}
        {mode === 'integration' && <IntegrationCard isExpanded={true} />}
        {mode === 'repo' && <RepoCard isExpanded={true} />}
      </div>
    </div>
  )

  return (
    <div className={`${styles.dashboard} ${getConditionalClass(styles, 'dark', isDark)} ${getConditionalClass(styles, 'expandedLayout', mode !== 'dashboard')}`}>
      {mode !== 'dashboard' ? renderExpandedMode() : renderDashboardMode()}
    </div>
  )
}