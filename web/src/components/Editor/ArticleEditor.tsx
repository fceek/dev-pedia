'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import BlockEditor from './BlockEditor'
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
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onMakeSecret?: (makeSecretFn: (level: number) => void) => void
  onFormat?: (formatFn: (format: string) => void) => void
  onActiveFormatsChange?: (formats: any) => void
  onClassificationLevelChange?: (level: number | null) => void
  onSelectedBlocksChange?: (count: number) => void
  onDeleteBlocksAction?: (deleteFn: () => void) => void
}

export default function ArticleEditor({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  className = "",
  isImmersive = false,
  onImmersiveToggle,
  status: externalStatus,
  onStatusChange,
  onMakeSecret,
  onFormat,
  onActiveFormatsChange,
  onClassificationLevelChange,
  onSelectedBlocksChange,
  onDeleteBlocksAction
}: ArticleEditorProps) {
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  
  const defaultContent = `# Complete Markdown Guide

This article demonstrates all markdown features supported by the editor.

## Headers

Headers from H1 to H5 are supported:

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5

## Text Formatting

**Bold text** for emphasis.

*Italic text* for subtle emphasis.

***Bold and italic*** for maximum emphasis.

~~Strikethrough text~~ for corrections.

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered Lists

1. First step
2. Second step
3. Third step

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> And include multiple paragraphs.

## Code

Inline code: \`const variable = "value"\`

### Code Blocks

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`)
  return true
}

greet("World")
\`\`\`

\`\`\`python
def calculate(x, y):
    """Calculate something"""
    result = x + y
    return result
\`\`\`

## Tables

| Feature | Supported | Notes |
| -------- | -------- | -------- |
| Headers | ✓ | H1-H5 |
| Bold | ✓ | **text** |
| Tables | ✓ | GFM tables |
| Secrets | ✓ | {{2:classified content}} |

## Callouts

> [!info]
> This is an informational callout with helpful context.

> [!success]
> Operation completed successfully!

> [!warning]
> Be careful with this operation.

> [!error]
> An error occurred during processing.

> [!custom]
> Custom callout with rainbow styling.

## Inline Classification

Public information is visible to everyone.

{{2:This content requires Level 2 clearance to view.}}

{{3:Level 3 classified information appears here.}}

Normal text {{4:Level 4 secret}} and more normal text.

{{5:Top secret Level 5 content with multiple words and sensitive data.}}

## Links and Images

[External link](https://example.com)

[Internal link](/docs/getting-started)

## Horizontal Rule

---

## Complex Example

Here's a complex paragraph with **bold**, *italic*, ***both***, ~~strikethrough~~, \`inline code\`, and {{3:classified information}} all in one sentence.

### Nested Lists with Code

1. First, install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Then configure the settings:
   - Edit \`config.json\`
   - Set \`debug: false\`
   - Add your API key

3. Finally, run the application

## End Notes

This article covers all supported markdown features. Use the quick actions toolbar to format text easily!
`

  const [articleData, setArticleData] = useState<ArticleData>({
    title: initialData?.title || '',
    fullPath: initialData?.fullPath || '',
    parentPath: initialData?.parentPath || '',
    classificationLevel: initialData?.classificationLevel || Math.min(classificationLevel, 2),
    status: initialData?.status || 'draft',
    content: initialData?.content || defaultContent,
    secrets: initialData?.secrets || [],
    tags: initialData?.tags || [],
    description: initialData?.description || ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [makeSecretFn, setMakeSecretFn] = useState<((level: number) => void) | null>(null)
  const [isPathManuallyEdited, setIsPathManuallyEdited] = useState(!!initialData?.fullPath)
  const [selectedBlockCount, setSelectedBlockCount] = useState(0)
  const deleteBlocksFnRef = useRef<(() => void) | null>(null)

  // Handle selected blocks change from BlockEditor
  const handleSelectedBlocksChange = useCallback((count: number) => {
    setSelectedBlockCount(count)
    if (onSelectedBlocksChange) {
      onSelectedBlocksChange(count)
    }
  }, [onSelectedBlocksChange])

  // Handle block action function (delete)
  const handleBlockAction = useCallback((actionFn: () => void) => {
    deleteBlocksFnRef.current = actionFn
    if (onDeleteBlocksAction) {
      onDeleteBlocksAction(actionFn)
    }
  }, [onDeleteBlocksAction])

  // Delete selected blocks
  const handleDeleteSelectedBlocks = useCallback(() => {
    if (deleteBlocksFnRef.current) {
      deleteBlocksFnRef.current()
    }
  }, [])

  // Handle active block change from BlockEditor
  const handleActiveBlockChange = useCallback((blockType: string, metadata?: any) => {
    // Convert block type to active formats for toolbar
    const formats: any = {}

    if (blockType === 'heading' && metadata?.headingLevel) {
      formats[`h${metadata.headingLevel}`] = true
    }

    if (onActiveFormatsChange) {
      onActiveFormatsChange(formats)
    }

    if (onClassificationLevelChange && metadata?.classificationLevel) {
      onClassificationLevelChange(metadata.classificationLevel)
    }
  }, [onActiveFormatsChange, onClassificationLevelChange])

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
  // This receives the function from MarkdownEditor via setMakeSecretFn prop
  const handleSetMakeSecretFn = useCallback((fn: (level: number) => void) => {
    setMakeSecretFn(() => fn) // Store in state
    if (onMakeSecret) {
      onMakeSecret(fn) // Immediately forward to parent
    }
  }, [onMakeSecret])

  // Use external status if provided, otherwise use internal articleData.status
  const currentStatus = externalStatus !== undefined ? externalStatus : articleData.status

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
                {/* Extracted title display */}
                <div className={`${styles.extractedTitle} ${!articleData.title || !articleData.content.trimStart().startsWith('# ') ? styles.noTitle : ''}`}>
                  {(() => {
                    const firstLine = articleData.content.trimStart().split('\n')[0]
                    if (!firstLine || !firstLine.startsWith('# ')) {
                      return 'First block must be H1 heading'
                    }
                    // Convert title to slug format
                    const title = firstLine.replace(/^#\s+/, '').trim()
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                    return slug ? `${slug}.md` : 'untitled.md'
                  })()}
                </div>

                {/* Content Area with inline title */}
                <BlockEditor
                  value={articleData.content}
                  onChange={(content) => {
                    // Extract title from FIRST H1 only
                    const firstLine = content.trimStart().split('\n')[0]
                    if (firstLine && firstLine.startsWith('# ')) {
                      const extractedTitle = firstLine.replace(/^#\s+/, '').trim()
                      if (extractedTitle !== articleData.title) {
                        updateArticleData('title', extractedTitle)
                      }
                    } else {
                      // Clear title if first line is not H1
                      if (articleData.title) {
                        updateArticleData('title', '')
                      }
                    }
                    updateArticleData('content', content)
                  }}
                  className={errors.content || errors.secrets ? styles.error : ''}
                  onFormat={onFormat}
                  onActiveBlockChange={handleActiveBlockChange}
                  onSelectedBlocksChange={handleSelectedBlocksChange}
                  onBlockAction={handleBlockAction}
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