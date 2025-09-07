'use client'

import { useState, useEffect } from 'react'
import { MarkdownHooks } from "react-markdown"
import remarkGfm from 'remark-gfm'
import rehypeStarryNight from 'rehype-starry-night'
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

interface ArticleTag {
  id: string
  name: string
  color: string
  darkColor?: string
}

interface ArticleData {
  title: string
  fullPath: string
  parentPath?: string
  classificationLevel: number
  status: 'draft' | 'published'
  content: string
  secrets: Secret[]
  tags: ArticleTag[]
  description?: string
}

interface ArticleEditorProps {
  initialData?: Partial<ArticleData>
  isEditing?: boolean
  onSave?: (data: ArticleData) => Promise<void>
  onCancel?: () => void
  className?: string
  isImmersive?: boolean
  onImmersiveToggle?: (immersive: boolean) => void
  previewMode?: boolean
  onPreviewToggle?: (preview: boolean) => void
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onMakeSecret?: (makeSecretFn: () => void) => void
}

export default function ArticleEditor({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  className = "",
  isImmersive = false,
  onImmersiveToggle,
  previewMode: externalPreviewMode,
  onPreviewToggle,
  status: externalStatus,
  onStatusChange,
  onMakeSecret
}: ArticleEditorProps) {
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  
  const [articleData, setArticleData] = useState<ArticleData>({
    title: initialData?.title || '',
    fullPath: initialData?.fullPath || '',
    parentPath: initialData?.parentPath || '',
    classificationLevel: initialData?.classificationLevel || Math.min(classificationLevel, 2),
    status: initialData?.status || 'draft',
    content: initialData?.content || '',
    secrets: initialData?.secrets || [],
    tags: initialData?.tags || [],
    description: initialData?.description || ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [internalPreviewMode, setInternalPreviewMode] = useState(false)
  const previewMode = externalPreviewMode !== undefined ? externalPreviewMode : internalPreviewMode
  const [makeSecretFn, setMakeSecretFn] = useState<(() => void) | null>(null)
  const [isPathManuallyEdited, setIsPathManuallyEdited] = useState(!!initialData?.fullPath)
  
  // Handle preview mode changes
  const handlePreviewToggle = (newPreviewMode: boolean) => {
    if (onPreviewToggle) {
      onPreviewToggle(newPreviewMode)
    } else {
      setInternalPreviewMode(newPreviewMode)
    }
  }

  // Handle status changes
  const handleStatusChange = (newStatus: 'draft' | 'published') => {
    if (onStatusChange) {
      onStatusChange(newStatus)
    } else {
      updateArticleData('status', newStatus)
    }
  }
  const [newTagName, setNewTagName] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  
  // Expose makeSecret function to parent
  useEffect(() => {
    if (onMakeSecret && makeSecretFn) {
      onMakeSecret(makeSecretFn)
    }
  }, [onMakeSecret, makeSecretFn])

  // Use external status if provided, otherwise use internal articleData.status
  const currentStatus = externalStatus !== undefined ? externalStatus : articleData.status

  // Process markdown content for preview, handling secrets
  const processContentForPreview = (content: string): string => {
    return content.replace(/\{\{SECRET:([^}]+)\}\}/g, (match, key) => {
      const secret = articleData.secrets.find(s => s.key === key)
      if (!secret) {
        return `**[MISSING SECRET: ${key}]**`
      }
      if (secret.classificationLevel > classificationLevel) {
        return `**[CLASSIFIED - Level ${secret.classificationLevel}]**`
      }
      return secret.content
    })
  }

  // Get available classification levels (user can create articles up to their level)
  const getAvailableClassificationLevels = () => {
    const levels = []
    for (let i = 1; i <= classificationLevel; i++) {
      levels.push(i)
    }
    return levels
  }

  // Generate full path automatically from title if not manually set
  const generateFullPath = (title: string): string => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    return `/docs/${slug}`
  }

  // Update article data
  const updateArticleData = <K extends keyof ArticleData>(field: K, value: ArticleData[K]) => {
    setArticleData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate full path when title changes (unless manually edited)
      if (field === 'title' && !isPathManuallyEdited) {
        updated.fullPath = generateFullPath(value as string)
      }
      
      // Mark path as manually edited when user changes it
      if (field === 'fullPath') {
        setIsPathManuallyEdited(true)
      }
      
      // Auto-generate parent path from full path
      if (field === 'fullPath' || (field === 'title' && !isPathManuallyEdited)) {
        const pathValue = field === 'fullPath' ? value as string : updated.fullPath
        const pathParts = pathValue.split('/').filter(Boolean)
        if (pathParts.length > 1) {
          // Remove the last part to get parent path
          updated.parentPath = '/' + pathParts.slice(0, -1).join('/')
        } else {
          updated.parentPath = undefined
        }
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
              {/* Row 1: URL, Classification, Status */}
              <div className={styles.primaryRow}>
                <div className={styles.urlField}>
                  <label htmlFor="fullPath">URL *</label>
                  <input
                    id="fullPath"
                    type="text"
                    value={articleData.fullPath}
                    onChange={(e) => updateArticleData('fullPath', e.target.value)}
                    placeholder="/docs/getting-started"
                    className={`${styles.pathInput} ${errors.fullPath ? styles.error : ''}`}
                    disabled={isLoading}
                  />
                  {errors.fullPath && <span className={styles.errorText}>{errors.fullPath}</span>}
                </div>

                <div className={styles.fieldGroup}>
                  <label>Classification</label>
                  <div className={styles.classificationContainer}>
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        className={`${styles.classificationCircle} ${level <= articleData.classificationLevel ? styles.filled : ''} ${level <= classificationLevel ? styles.available : styles.disabled}`}
                        data-level={level}
                        onClick={() => level <= classificationLevel && updateArticleData('classificationLevel', level)}
                        disabled={isLoading || level > classificationLevel}
                      />
                    ))}
                    <div className={styles.levelIndicator} data-level={articleData.classificationLevel}>
                      LEVEL {articleData.classificationLevel}
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Description and Tags */}
              <div className={styles.secondaryRow}>
                <div className={styles.descriptionField}>
                  <label htmlFor="description">Description</label>
                  <input
                    id="description"
                    type="text"
                    value={articleData.description}
                    onChange={(e) => updateArticleData('description', e.target.value)}
                    placeholder="Brief description of the article"
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
                
                <div className={styles.tagsField}>
                  <label>Tags</label>
                  <div className={styles.tagsContainer}>
                    <div className={styles.tagsList}>
                      {articleData.tags.map((tag, index) => (
                        <span
                          key={tag.id || index}
                          className={styles.tag}
                          style={{ backgroundColor: isDark ? (tag.darkColor || tag.color) : tag.color }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            className={styles.removeTag}
                            onClick={() => {
                              const updatedTags = articleData.tags.filter((_, i) => i !== index)
                              updateArticleData('tags', updatedTags)
                            }}
                            disabled={isLoading}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      
                      {showTagInput ? (
                        <div className={styles.tagInput}>
                          <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Tag name"
                            className={styles.newTagInput}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                if (newTagName.trim()) {
                                  const hue = Math.random() * 360
                                  const newTag = {
                                    id: Date.now().toString(),
                                    name: newTagName.trim(),
                                    color: `hsl(${hue}, 50%, 60%)`,
                                    darkColor: `hsl(${hue}, 50%, 40%)`
                                  }
                                  updateArticleData('tags', [...articleData.tags, newTag])
                                  setNewTagName('')
                                  setShowTagInput(false)
                                }
                              } else if (e.key === 'Escape') {
                                setNewTagName('')
                                setShowTagInput(false)
                              }
                            }}
                            onBlur={() => {
                              if (newTagName.trim()) {
                                const hue = Math.random() * 360
                                const newTag = {
                                  id: Date.now().toString(),
                                  name: newTagName.trim(),
                                  color: `hsl(${hue}, 50%, 60%)`,
                                  darkColor: `hsl(${hue}, 50%, 40%)`
                                }
                                updateArticleData('tags', [...articleData.tags, newTag])
                              }
                              setNewTagName('')
                              setShowTagInput(false)
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.addTag}
                          onClick={() => setShowTagInput(true)}
                          disabled={isLoading}
                        >
                          + Add Tag
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor Window */}
            <div className={styles.editorSection}>
              <div className={styles.contentWindow}>
                {/* Title Bar */}
                <div className={styles.titleBar}>
                  <input
                    id="title"
                    type="text"
                    value={articleData.title}
                    onChange={(e) => updateArticleData('title', e.target.value)}
                    placeholder="Article title"
                    className={`${styles.titleInput} ${errors.title ? styles.error : ''}`}
                    disabled={isLoading}
                  />
                  <div className={styles.titleBarInfo}>
                    {articleData.secrets.length} secrets
                  </div>
                </div>
                
                {/* Content Area */}
                <MarkdownEditor
                  value={articleData.content}
                  onChange={(content) => updateArticleData('content', content)}
                  secrets={articleData.secrets}
                  onSecretsChange={(secrets) => updateArticleData('secrets', secrets)}
                  className={errors.content || errors.secrets ? styles.error : ''}
                  onMakeSecret={setMakeSecretFn}
                />
              </div>
              
              {/* Error Messages */}
              {errors.title && <span className={styles.errorText}>{errors.title}</span>}
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
                <span>Status: {currentStatus}</span>
                {articleData.secrets.length > 0 && (
                  <span>Secrets: {articleData.secrets.length}</span>
                )}
              </div>
              {articleData.description && (
                <p className={styles.previewDescription}>{articleData.description}</p>
              )}
              {articleData.tags.length > 0 && (
                <div className={styles.previewTags}>
                  {articleData.tags.map((tag, index) => (
                    <span
                      key={tag.id || index}
                      className={styles.previewTag}
                      style={{ backgroundColor: isDark ? (tag.darkColor || tag.color) : tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.previewContent}>
              <MarkdownHooks
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeStarryNight]}
              >
                {
                  processContentForPreview(articleData.content)
                }
              </MarkdownHooks>
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
{isLoading ? 'Saving...' : (currentStatus === 'draft' ? 'Save as Draft' : 'Publish')}
        </button>
      </div>
    </div>
  )
}