'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './MarkdownEditor.module.css'

interface Secret {
  key: string
  classificationLevel: number
  content: string
  description?: string
}

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  secrets: Secret[]
  onSecretsChange: (secrets: Secret[]) => void
  placeholder?: string
  rows?: number
  className?: string
  onMakeSecret?: (makeSecretFn: () => void) => void
}

export default function MarkdownEditor({
  value,
  onChange,
  secrets,
  onSecretsChange,
  placeholder = "Write your article content here...\n\nYou can select text and convert it to classified content using the toolbar above.",
  rows = 15,
  className = "",
  onMakeSecret
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  
  const [selectedText, setSelectedText] = useState('')
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)

  // Auto-resize textarea to fit content
  const autoResizeTextarea = useCallback(() => {
    if (!textareaRef.current || !overlayRef.current) return
    
    const textarea = textareaRef.current
    const overlay = overlayRef.current
    
    // Reset height to measure scroll height accurately
    textarea.style.height = 'auto'
    
    // Calculate new height (content + padding)
    const contentHeight = textarea.scrollHeight
    const minHeight = 400 // Match CSS min-height
    const newHeight = Math.max(contentHeight, minHeight)
    
    // Apply height to both textarea and overlay
    textarea.style.height = `${newHeight}px`
    overlay.style.height = `${newHeight}px`
  }, [])

  // Auto-resize when value changes
  useEffect(() => {
    autoResizeTextarea()
  }, [value, autoResizeTextarea])

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return
    
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selected = value.substring(start, end)
    
    setSelectedText(selected.trim())
    setSelectionStart(start)
    setSelectionEnd(end)
  }, [value])

  // Convert selected text to secret
  const handleCreateSecret = () => {
    if (!selectedText) return
    // This function is exposed to parent for external handling
  }


  // Edit existing secret
  const handleEditSecret = (secretKey: string) => {
    const secret = secrets.find(s => s.key === secretKey)
    if (secret) {
      // This function is exposed to parent for external handling
    }
  }

  // Delete secret and replace placeholder with content
  const handleDeleteSecret = (secretKey: string) => {
    const secret = secrets.find(s => s.key === secretKey)
    if (!secret) return

    // Replace placeholder with original content
    const placeholder = `{{SECRET:${secretKey}}}`
    const newValue = value.replace(placeholder, secret.content)
    onChange(newValue)

    // Remove from secrets list
    onSecretsChange(secrets.filter(s => s.key !== secretKey))
  }



  // Expose handleCreateSecret to parent component
  useEffect(() => {
    if (onMakeSecret) {
      onMakeSecret(handleCreateSecret)
    }
  }, [onMakeSecret, handleCreateSecret])

  return (
    <div className={`${styles.editorContainer} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>

      {/* Editor */}
      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            // Trigger auto-resize on next frame to ensure DOM is updated
            setTimeout(autoResizeTextarea, 0)
          }}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
        />
        
        {/* Secret placeholders overlay for visual highlighting */}
        <div ref={overlayRef} className={styles.highlightOverlay}>
          {value.split('\n').map((line, lineIndex) => (
            <div key={lineIndex} className={styles.line}>
              {line.split(/({{SECRET:[^}]+}})/).map((part, partIndex) => {
                if (part.match(/{{SECRET:[^}]+}}/)) {
                  const secretKey = part.match(/{{SECRET:([^}]+)}}/)?.[1]
                  const secret = secrets.find(s => s.key === secretKey)
                  return (
                    <span
                      key={partIndex}
                      className={`${styles.secretPlaceholder} ${styles[`level${secret?.classificationLevel || 2}`]}`}
                      onClick={() => secretKey && handleEditSecret(secretKey)}
                      title={secret ? `Level ${secret.classificationLevel}: ${secret.description || 'No description'}` : 'Unknown secret'}
                    >
                      {part}
                    </span>
                  )
                }
                return <span key={partIndex} className={styles.normalText}>{part}</span>
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Secrets List */}
      {secrets.length > 0 && (
        <div className={styles.secretsList}>
          <h4>Classified Content ({secrets.length})</h4>
          <div className={styles.secrets}>
            {secrets.map(secret => (
              <div key={secret.key} className={`${styles.secretItem} ${styles[`level${secret.classificationLevel}`]}`}>
                <div className={styles.secretHeader}>
                  <span className={styles.secretKey}>{`{{SECRET:${secret.key}}}`}</span>
                  <span className={styles.secretLevel}>Level {secret.classificationLevel}</span>
                  <div className={styles.secretActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditSecret(secret.key)}
                      title="Edit secret"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteSecret(secret.key)}
                      title="Delete secret and restore original text"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {secret.description && (
                  <div className={styles.secretDescription}>{secret.description}</div>
                )}
                <div className={styles.secretContent}>{secret.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

