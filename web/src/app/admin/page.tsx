'use client'

import { useState, useRef, useCallback } from 'react'
import Layout from '@/components/Layout/Layout'
import Dashboard from '@/components/Admin/Dashboard/Dashboard'
import RightColumnContainer from '@/components/Admin/RightColumn/RightColumnContainer'

export type AdminMode = 'dashboard' | 'me' | 'article' | 'token' | 'integration' | 'repo'

export default function AdminPage() {
  const [isImmersive, setIsImmersive] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [currentMode, setCurrentMode] = useState<AdminMode>('dashboard')
  const makeSecretFnRef = useRef<((level: number) => void) | null>(null)
  const [articleStatus, setArticleStatus] = useState<'draft' | 'published'>('draft')
  const formatFnRef = useRef<((format: string) => void) | null>(null)
  const [activeFormats, setActiveFormats] = useState<any>({})
  const [currentClassificationLevel, setCurrentClassificationLevel] = useState<number | null>(null)
  const [selectedBlockCount, setSelectedBlockCount] = useState(0)
  const deleteBlocksFnRef = useRef<(() => void) | null>(null)

  const handleBreadcrumbNavigation = (item: string) => {
    // Map breadcrumb labels back to modes
    const labelToMode: { [key: string]: AdminMode } = {
      'Dashboard': 'dashboard',
      'Me': 'me',
      'Articles': 'article', 
      'Tokens': 'token',
      'GitHub': 'integration',
      'Repositories': 'repo'
    }
    
    if (item === 'Admin') {
      // Clicking "Admin" goes back to dashboard
      setCurrentMode('dashboard')
    } else if (labelToMode[item]) {
      setCurrentMode(labelToMode[item])
    }
  }

  const handleMakeSecret = useCallback((level: number) => {
    if (!makeSecretFnRef.current) {
      return
    }
    if (typeof level !== 'number') {
      return
    }
    makeSecretFnRef.current(level)
  }, [])

  const handleFormat = useCallback((format: string) => {
    if (formatFnRef.current) {
      formatFnRef.current(format)
    }
  }, [])

  const setMakeSecretFn = useCallback((fn: (level: number) => void) => {
    makeSecretFnRef.current = fn
  }, [])

  const setFormatFn = useCallback((fn: (format: string) => void) => {
    formatFnRef.current = fn
  }, [])

  const setDeleteBlocksFn = useCallback((fn: () => void) => {
    deleteBlocksFnRef.current = fn
  }, [])

  const handleDeleteSelectedBlocks = useCallback(() => {
    if (deleteBlocksFnRef.current) {
      deleteBlocksFnRef.current()
    }
  }, [])

  const getBreadcrumbs = () => {
    const modeLabels = {
      dashboard: 'Dashboard',
      me: 'Me',
      article: 'Articles',
      token: 'Tokens', 
      integration: 'GitHub',
      repo: 'Repositories'
    }
    return [modeLabels[currentMode], 'Admin']
  }

  return (
    <Layout
      leftColumn={<Dashboard mode={currentMode} isImmersive={isImmersive} onImmersiveToggle={setIsImmersive} previewMode={previewMode} onPreviewToggle={setPreviewMode} onMakeSecret={setMakeSecretFn} status={articleStatus} onStatusChange={setArticleStatus} onModeChange={setCurrentMode} onFormat={setFormatFn} onActiveFormatsChange={setActiveFormats} onClassificationLevelChange={setCurrentClassificationLevel} onSelectedBlocksChange={setSelectedBlockCount} onDeleteBlocksAction={setDeleteBlocksFn} />}
      rightColumn={<RightColumnContainer mode={currentMode} isImmersive={isImmersive} onImmersiveToggle={setIsImmersive} previewMode={previewMode} onPreviewToggle={setPreviewMode} status={articleStatus} onStatusChange={setArticleStatus} onMakeSecret={handleMakeSecret} onFormat={handleFormat} activeFormats={activeFormats} currentClassificationLevel={currentClassificationLevel} selectedBlockCount={selectedBlockCount} onDeleteSelectedBlocks={handleDeleteSelectedBlocks} />}
      breadcrumbs={getBreadcrumbs()}
      onBreadcrumbClick={handleBreadcrumbNavigation}
      author="Fceek@London"
      year={2025}
      gridRatio="3fr 1fr"
      isExpanded={isImmersive}
    />
  )
}