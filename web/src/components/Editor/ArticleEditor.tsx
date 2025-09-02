'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import MarkdownEditor from './MarkdownEditor'
import styles from './ArticleEditor.module.css'

interface Secret {
  key: string
  classificationLevel: number
  content: string
  description?: string
}

interface ArticleData {
  title: string
  sourceType: 'doc' | 'git'
  fullPath: string
  parentPath?: string
  classificationLevel: number
  status: 'draft' | 'published'
  content: string
  secrets: Secret[]
  description?: string
}

interface ArticleEditorProps {
  initialData?: Partial<ArticleData>
  isEditing?: boolean
  onSave?: (data: ArticleData) => Promise<void>
  onCancel?: () => void
  className?: string
}

export default function ArticleEditor({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  className = ""
}: ArticleEditorProps) {
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  
  const [articleData, setArticleData] = useState<ArticleData>({
    title: initialData?.title || '',
    sourceType: initialData?.sourceType || 'doc',
    fullPath: initialData?.fullPath || '',
    parentPath: initialData?.parentPath || '',
    classificationLevel: initialData?.classificationLevel || Math.min(classificationLevel, 2),
    status: initialData?.status || 'draft',
    content: initialData?.content || '',
    secrets: initialData?.secrets || [],
    description: initialData?.description || ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewMode, setPreviewMode] = useState(false)

  // Get available classification levels (user can create articles up to their level)
  const getAvailableClassificationLevels = () => {
    const levels = []
    for (let i = 1; i <= classificationLevel; i++) {
      levels.push(i)
    }
    return levels
  }

  // Generate full path automatically from title if not manually set
  const generateFullPath = (title: string, sourceType: string): string => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    const basePath = sourceType === 'doc' ? '/docs' : '/git'
    return `${basePath}/${slug}`
  }

  // Update article data
  const updateArticleData = <K extends keyof ArticleData>(field: K, value: ArticleData[K]) => {
    setArticleData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate full path when title changes (unless manually edited)
      if (field === 'title' && !prev.fullPath) {
        updated.fullPath = generateFullPath(value, updated.sourceType)
      }
      
      return updated
    })
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!articleData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!articleData.fullPath.trim()) {
      newErrors.fullPath = 'Full path is required'
    } else if (!articleData.fullPath.startsWith('/')) {
      newErrors.fullPath = 'Full path must start with /'
    }
    
    if (!articleData.content.trim()) {
      newErrors.content = 'Content is required'
    }
    
    // Validate secret keys are unique and valid
    const secretKeys = articleData.secrets.map(s => s.key)
    const duplicateKeys = secretKeys.filter((key, index) => secretKeys.indexOf(key) !== index)
    if (duplicateKeys.length > 0) {
      newErrors.secrets = `Duplicate secret keys: ${duplicateKeys.join(', ')}`
    }
    
    // Check if all secret placeholders have corresponding secrets
    const placeholders = (articleData.content.match(/\{\{SECRET:[^}]+\}\}/g) || [])
      .map(p => p.match(/\{\{SECRET:([^}]+)\}\}/)?.[1])
      .filter(Boolean) as string[]
    
    const missingSecrets = placeholders.filter(key => !secretKeys.includes(key))
    if (missingSecrets.length > 0) {
      newErrors.secrets = `Missing secrets for placeholders: ${missingSecrets.join(', ')}`
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }
    
    if (!onSave) {
      console.error('No onSave handler provided')
      return
    }
    
    setIsLoading(true)
    try {
      await onSave(articleData)
    } catch (error) {
      console.error('Failed to save article:', error)
      setErrors({ general: 'Failed to save article. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const availableLevels = getAvailableClassificationLevels()

  return (
    <div className={`${styles.articleEditor} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
      <div className={styles.header}>
        <h2>{isEditing ? 'Edit Article' : 'Create New Article'}</h2>
        <div className={styles.headerActions}>
          <button
            className={`${styles.toggleButton} ${previewMode ? styles.active : ''}`}
            onClick={() => setPreviewMode(!previewMode)}
            disabled={isLoading}
          >
            {previewMode ? '📝 Edit' : '👁️ Preview'}
          </button>
        </div>
      </div>

      {errors.general && (
        <div className={styles.errorAlert}>
          {errors.general}
        </div>
      )}

      <div className={styles.content}>
        {!previewMode ? (
          <>
            {/* Article Metadata */}
            <div className={styles.metadata}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    value={articleData.title}
                    onChange={(e) => updateArticleData('title', e.target.value)}
                    placeholder="Enter article title"
                    className={`${styles.input} ${errors.title ? styles.error : ''}`}
                    disabled={isLoading}
                  />
                  {errors.title && <span className={styles.errorText}>{errors.title}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="sourceType">Source Type</label>
                  <select
                    id="sourceType"
                    value={articleData.sourceType}
                    onChange={(e) => updateArticleData('sourceType', e.target.value as 'doc' | 'git')}
                    className={styles.select}
                    disabled={isLoading}
                  >
                    <option value="doc">Documentation</option>
                    <option value="git">Git Repository</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="fullPath">Full Path *</label>
                  <input
                    id="fullPath"
                    type="text"
                    value={articleData.fullPath}
                    onChange={(e) => updateArticleData('fullPath', e.target.value)}
                    placeholder="/docs/getting-started"
                    className={`${styles.input} ${errors.fullPath ? styles.error : ''}`}
                    disabled={isLoading}
                  />
                  {errors.fullPath && <span className={styles.errorText}>{errors.fullPath}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="parentPath">Parent Path</label>
                  <input
                    id="parentPath"
                    type="text"
                    value={articleData.parentPath}
                    onChange={(e) => updateArticleData('parentPath', e.target.value)}
                    placeholder="/docs (optional)"
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="classificationLevel">Classification Level</label>
                  <select
                    id="classificationLevel"
                    value={articleData.classificationLevel}
                    onChange={(e) => updateArticleData('classificationLevel', parseInt(e.target.value))}
                    className={styles.select}
                    disabled={isLoading}
                  >
                    {availableLevels.map(level => (
                      <option key={level} value={level}>
                        Level {level} {level === 1 ? '(Public)' : level === 2 ? '(Restricted)' : level === 3 ? '(Confidential)' : level === 4 ? '(Secret)' : level === 5 ? '(Top Secret)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={articleData.status}
                    onChange={(e) => updateArticleData('status', e.target.value as 'draft' | 'published')}
                    className={styles.select}
                    disabled={isLoading}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  type="text"
                  value={articleData.description}
                  onChange={(e) => updateArticleData('description', e.target.value)}
                  placeholder="Brief description of the article (optional)"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Content Editor */}
            <div className={styles.editorSection}>
              <label htmlFor="content">Content * ({articleData.secrets.length} secrets)</label>
              <MarkdownEditor
                value={articleData.content}
                onChange={(content) => updateArticleData('content', content)}
                secrets={articleData.secrets}
                onSecretsChange={(secrets) => updateArticleData('secrets', secrets)}
                className={errors.content || errors.secrets ? styles.error : ''}
              />
              {(errors.content || errors.secrets) && (
                <span className={styles.errorText}>
                  {errors.content || errors.secrets}
                </span>
              )}
            </div>
          </>
        ) : (
          /* Preview Mode */
          <div className={styles.preview}>
            <div className={styles.previewMetadata}>
              <h1>{articleData.title || 'Untitled Article'}</h1>
              <div className={styles.previewMeta}>
                <span>Path: {articleData.fullPath}</span>
                <span>Level: {articleData.classificationLevel}</span>
                <span>Status: {articleData.status}</span>
                {articleData.secrets.length > 0 && (
                  <span>Secrets: {articleData.secrets.length}</span>
                )}
              </div>
              {articleData.description && (
                <p className={styles.previewDescription}>{articleData.description}</p>
              )}
            </div>
            
            <div className={styles.previewContent}>
              {articleData.content.split('\n').map((line, index) => (
                <div key={index} className={styles.previewLine}>
                  {line.split(/({{SECRET:[^}]+}})/).map((part, partIndex) => {
                    if (part.match(/{{SECRET:[^}]+}}/)) {
                      const secretKey = part.match(/{{SECRET:([^}]+)}}/)?.[1]
                      const secret = articleData.secrets.find(s => s.key === secretKey)
                      return (
                        <span
                          key={partIndex}
                          className={`${styles.previewSecret} ${styles[`level${secret?.classificationLevel || 2}`]}`}
                          title={secret ? `Level ${secret.classificationLevel}: ${secret.description || 'No description'}` : 'Unknown secret'}
                        >
                          [CLASSIFIED - Level {secret?.classificationLevel || '?'}]
                        </span>
                      )
                    }
                    return <span key={partIndex}>{part}</span>
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (isEditing ? 'Update Article' : 'Create Article')}
        </button>
      </div>
    </div>
  )
}