'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './ArticleActions.module.css'

interface ArticleActionsProps {
  isPreview?: boolean
  onPreviewToggle?: (preview: boolean) => void
  isImmersive?: boolean
  onImmersiveToggle?: (immersive: boolean) => void
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onMakeSecret?: (level: number | null) => void
  onFormat?: (format: string) => void
}

export default function ArticleActions({ 
  isPreview = false, 
  onPreviewToggle,
  isImmersive = false,
  onImmersiveToggle,
  status = 'draft',
  onStatusChange,
  onMakeSecret,
  onFormat
}: ArticleActionsProps) {
  const { isDark, getConditionalClass } = useTheme()
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  return (
    <div className={`${styles.articleActions} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>QUICK ACTIONS</div>
      <div className={styles.actionsList}>
        
        {/* Row 1: Preview and Status toggles (no labels) */}
        <div className={styles.toggleRow}>
          {/* Preview Toggle - Compact */}
          {onPreviewToggle && (
            <div className={styles.compactActionButton}>
              <button
                className={!isPreview ? styles.active : ''}
                onClick={() => onPreviewToggle(false)}
              >
                Edit
              </button>
              <button
                className={isPreview ? styles.active : ''}
                onClick={() => onPreviewToggle(true)}
              >
                Preview
              </button>
            </div>
          )}

          {/* Status Toggle - Compact */}
          {onStatusChange && (
            <div className={styles.compactActionButton}>
              <button
                className={status === 'draft' ? styles.active : ''}
                onClick={() => onStatusChange('draft')}
              >
                Draft
              </button>
              <button
                className={status === 'published' ? styles.active : ''}
                onClick={() => onStatusChange('published')}
              >
                Publish
              </button>
            </div>
          )}
        </div>

        {/* Immersive Toggle - With Label */}
        {onImmersiveToggle && (
          <div className={styles.toggleGroup}>
            <span className={styles.toggleLabel}>Immersive:</span>
            <div className={styles.compactActionButton}>
              <button
                className={!isImmersive ? styles.active : ''}
                onClick={() => onImmersiveToggle(false)}
              >
                Off
              </button>
              <button
                className={isImmersive ? styles.active : ''}
                onClick={() => onImmersiveToggle(true)}
              >
                On
              </button>
            </div>
          </div>
        )}

        <div className={styles.divider}></div>

        {/* Formatting Controls */}
        {onFormat && (
          <div className={styles.formattingSection}>
            {/* Headings Row */}
            <div className={styles.compactActionButton}>
              <button className={styles.headerLabel} disabled>Header</button>
              <button className={styles.headerNumber} onClick={() => onFormat('h1')} title="Heading 1">1</button>
              <button className={styles.headerNumber} onClick={() => onFormat('h2')} title="Heading 2">2</button>
              <button className={styles.headerNumber} onClick={() => onFormat('h3')} title="Heading 3">3</button>
              <button className={styles.headerNumber} onClick={() => onFormat('h4')} title="Heading 4">4</button>
              <button className={styles.headerNumber} onClick={() => onFormat('h5')} title="Heading 5">5</button>
            </div>
            
            {/* Text Formatting & Lists Row */}
            <div className={styles.compactActionButton}>
              <button onClick={() => onFormat('bold')} title="Bold">
                <strong>B</strong>
              </button>
              <button onClick={() => onFormat('italic')} title="Italic">
                <em>I</em>
              </button>
              <button onClick={() => onFormat('strikethrough')} title="Strikethrough">
                <span style={{ textDecoration: 'line-through' }}>S</span>
              </button>
              <button className={styles.tableShadowButton}></button>
              <button onClick={() => onFormat('ul')} title="Unordered List">•</button>
              <button onClick={() => onFormat('ol')} title="Ordered List">1.</button>
            </div>
            
            {/* Table Row */}
            <div className={styles.compactActionButton}>
              <button onClick={() => onFormat('table')} title="Insert Table">Table</button>
              <button className={styles.tableShadowButton}></button>
              <button onClick={() => onFormat('table-add-row')} title="Add Row">+ Row</button>
              <button onClick={() => onFormat('table-add-col')} title="Add Column">+ Column</button>
            </div>
            
            {/* Callouts Row */}
            <div className={styles.compactActionButton}>
              <button 
                className={styles.calloutButton}
                data-callout="info"
                onClick={() => onFormat('callout-info')} 
                title="Info Callout"
              >
                Info
              </button>
              <button 
                className={styles.calloutButton}
                data-callout="success"
                onClick={() => onFormat('callout-success')} 
                title="Success Callout"
              >
                Success
              </button>
              <button 
                className={styles.calloutButton}
                data-callout="warning"
                onClick={() => onFormat('callout-warning')} 
                title="Warning Callout"
              >
                Warning
              </button>
              <button 
                className={styles.calloutButton}
                data-callout="error"
                onClick={() => onFormat('callout-error')} 
                title="Error Callout"
              >
                Error
              </button>
              <button 
                className={styles.calloutButton}
                data-callout="custom"
                onClick={() => onFormat('callout-custom')} 
                title="Custom Callout"
              >
                Custom
              </button>
            </div>
          </div>
        )}

        <div className={styles.divider}></div>

        {/* Classification Stamp System */}
        {onMakeSecret && (
          <div className={styles.classificationSystem}>
            {/* Classification Document Area */}
            <div className={styles.documentArea}>
              <div className={styles.documentText}>
                <span>Classified:</span>
              </div>
              
              {selectedLevel && (
                <div 
                  key={selectedLevel}
                  className={`${styles.stampOverlay} ${styles.stampCircle}`} 
                  data-level={selectedLevel}
                >
                  <div className={styles.levelNumber}>{selectedLevel}</div>
                </div>
              )}
            </div>

            {/* Stamp Selection Row */}
            <div className={styles.stampTray}>
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  className={`${styles.stampCircle} ${selectedLevel === level ? styles.used : ''}`}
                  data-level={level}
                  onClick={() => {
                    setSelectedLevel(level)
                    onMakeSecret(level)
                  }}
                  title={`Set as Level ${level} ${level === 1 ? '(Public)' : 'secret'}`}
                >
                  <div className={styles.levelNumber}>{level}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}