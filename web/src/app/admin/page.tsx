'use client'

import { useState } from 'react'
import Layout from '@/components/Layout/Layout'
import Dashboard from '@/components/Admin/Dashboard/Dashboard'
import RightColumnContainer from '@/components/Admin/RightColumn/RightColumnContainer'

export type AdminMode = 'dashboard' | 'me' | 'article' | 'token' | 'integration' | 'repo'

export default function AdminPage() {
  const [isImmersive, setIsImmersive] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [currentMode, setCurrentMode] = useState<AdminMode>('dashboard')
  const [makeSecretFn, setMakeSecretFn] = useState<(() => void) | null>(null)
  const [articleStatus, setArticleStatus] = useState<'draft' | 'published'>('draft')

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

  const handleMakeSecret = () => {
    if (makeSecretFn) {
      makeSecretFn()
    }
  }

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
      leftColumn={<Dashboard mode={currentMode} isImmersive={isImmersive} onImmersiveToggle={setIsImmersive} previewMode={previewMode} onPreviewToggle={setPreviewMode} onMakeSecret={setMakeSecretFn} status={articleStatus} onStatusChange={setArticleStatus} onModeChange={setCurrentMode} />}
      rightColumn={<RightColumnContainer mode={currentMode} isImmersive={isImmersive} onImmersiveToggle={setIsImmersive} previewMode={previewMode} onPreviewToggle={setPreviewMode} status={articleStatus} onStatusChange={setArticleStatus} onMakeSecret={handleMakeSecret} />}
      breadcrumbs={getBreadcrumbs()}
      onBreadcrumbClick={handleBreadcrumbNavigation}
      author="Fceek@London"
      year={2025}
      gridRatio="3fr 1fr"
      isExpanded={isImmersive}
    />
  )
}