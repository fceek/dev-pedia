'use client'

import { useState, useRef, useCallback } from 'react'
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
}

export default function MarkdownEditor({
  value,
  onChange,
  secrets,
  onSecretsChange,
  placeholder = "Write your article content here...\n\nYou can select text and convert it to classified content using the toolbar above.",
  rows = 15,
  className = ""
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  
  const [selectedText, setSelectedText] = useState('')
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [showSecretModal, setShowSecretModal] = useState(false)
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null)

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
    setEditingSecret({
      key: '',
      classificationLevel: 2,
      content: selectedText,
      description: ''
    })
    setShowSecretModal(true)
  }

  // Save secret and replace text with placeholder
  const handleSaveSecret = (secret: Secret) => {
    if (!secret.key.trim()) return

    // Add or update secret in list
    const updatedSecrets = editingSecret 
      ? secrets.map(s => s.key === editingSecret.key ? secret : s)
      : [...secrets, secret]
    
    onSecretsChange(updatedSecrets)

    // Replace selected text with placeholder
    const placeholder = `{{SECRET:${secret.key}}}`
    const newValue = value.substring(0, selectionStart) + placeholder + value.substring(selectionEnd)
    onChange(newValue)

    setShowSecretModal(false)
    setEditingSecret(null)
    setSelectedText('')
  }

  // Edit existing secret
  const handleEditSecret = (secretKey: string) => {
    const secret = secrets.find(s => s.key === secretKey)
    if (secret) {
      setEditingSecret(secret)
      setShowSecretModal(true)
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

  // Get available classification levels (user can create secrets up to their level)
  const getAvailableLevels = () => {
    const levels = []
    for (let i = 2; i <= classificationLevel; i++) {
      levels.push(i)
    }
    return levels
  }

  // Count secrets by level for display
  const getSecretCounts = () => {
    const counts: Record<number, number> = {}
    secrets.forEach(secret => {
      counts[secret.classificationLevel] = (counts[secret.classificationLevel] || 0) + 1
    })
    return counts
  }

  const secretCounts = getSecretCounts()

  return (
    <div className={`${styles.editorContainer} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={`${styles.toolButton} ${selectedText ? styles.active : styles.disabled}`}
            onClick={handleCreateSecret}
            disabled={!selectedText}
            title="Convert selected text to classified content"
          >
            🔐 Make Secret ({selectedText.length} chars)
          </button>
        </div>
        
        <div className={styles.toolbarRight}>
          {Object.entries(secretCounts).map(([level, count]) => (
            <span key={level} className={styles.secretCount}>
              Level {level}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
        />
        
        {/* Secret placeholders overlay for visual highlighting */}
        <div className={styles.highlightOverlay}>
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

      {/* Secret Modal */}
      {showSecretModal && editingSecret && (
        <SecretModal
          secret={editingSecret}
          availableLevels={getAvailableLevels()}
          onSave={handleSaveSecret}
          onCancel={() => {
            setShowSecretModal(false)
            setEditingSecret(null)
          }}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// Secret editing modal component
interface SecretModalProps {
  secret: Secret
  availableLevels: number[]
  onSave: (secret: Secret) => void
  onCancel: () => void
  isDark: boolean
}

function SecretModal({ secret, availableLevels, onSave, onCancel, isDark }: SecretModalProps) {
  const [formData, setFormData] = useState(secret)

  const handleSave = () => {
    if (formData.key.trim()) {
      onSave(formData)
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${isDark ? styles.dark : ''}`}>
        <h3>Configure Classified Content</h3>
        
        <div className={styles.formGroup}>
          <label>Secret Key (unique identifier)</label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
            placeholder="e.g., database-credentials, api-keys"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Classification Level</label>
          <select
            value={formData.classificationLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, classificationLevel: parseInt(e.target.value) }))}
            className={styles.select}
          >
            {availableLevels.map(level => (
              <option key={level} value={level}>
                Level {level} {level === 2 ? '(Restricted)' : level === 3 ? '(Confidential)' : level === 4 ? '(Secret)' : level === 5 ? '(Top Secret)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Description (optional)</label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this classified content"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={!formData.key.trim()}
          >
            Save Secret
          </button>
        </div>
      </div>
    </div>
  )
}