'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './ArticleActions.module.css'

interface ArticleActionsProps {
  isImmersive?: boolean
  onImmersiveToggle?: (immersive: boolean) => void
  status?: 'draft' | 'published'
  onStatusChange?: (status: 'draft' | 'published') => void
  onMakeSecret?: (level: number) => void
  onFormat?: (format: string) => void
  activeFormats?: any
  currentClassificationLevel?: number | null
  selectedBlockCount?: number
  onDeleteSelectedBlocks?: () => void
}

export default function ArticleActions({
  isImmersive = false,
  onImmersiveToggle,
  status = 'draft',
  onStatusChange,
  onMakeSecret,
  onFormat,
  activeFormats = {},
  currentClassificationLevel = null,
  selectedBlockCount = 0,
  onDeleteSelectedBlocks
}: ArticleActionsProps) {
  const { isDark, getConditionalClass } = useTheme()
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [showCalloutMenu, setShowCalloutMenu] = useState(false)
  const calloutMenuRef = useRef<HTMLDivElement>(null)

  // Close callout menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calloutMenuRef.current && !calloutMenuRef.current.contains(event.target as Node)) {
        setShowCalloutMenu(false)
      }
    }

    if (showCalloutMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalloutMenu])

  return (
    <div className={`${styles.articleActions} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.sectionTitle}>QUICK ACTIONS</div>
      <div className={styles.actionsList}>
        
        {/* Row 1: Immersive and Status toggles (no labels) */}
        <div className={styles.toggleRow}>
          {/* Immersive Toggle - Compact */}
          {onImmersiveToggle && (
            <div className={styles.compactActionButton}>
              <button
                className={!isImmersive ? styles.active : ''}
                onClick={() => onImmersiveToggle(false)}
              >
                Normal
              </button>
              <button
                className={isImmersive ? styles.active : ''}
                onClick={() => onImmersiveToggle(true)}
              >
                Immersive
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

        <div className={styles.divider}></div>

        {/* Block-Level Controls */}
        {onDeleteSelectedBlocks && (
          <div className={styles.compactActionButton}>
            <button
              type="button"
              className={`${styles.deleteButton}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onDeleteSelectedBlocks && selectedBlockCount > 0) {
                  onDeleteSelectedBlocks()
                }
              }}
              disabled={selectedBlockCount === 0}
              title={selectedBlockCount > 0 ? "Delete selected blocks" : "Select blocks to delete"}
            >
              Delete {selectedBlockCount}
            </button>
            <button className={styles.blockControlLabel} disabled>Copy</button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: Copy as Markdown
              }}
              disabled={selectedBlockCount === 0}
              title="Copy selected blocks as Markdown"
            >
              MD
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: Copy as HTML
              }}
              disabled={selectedBlockCount === 0}
              title="Copy selected blocks as HTML"
            >
              HTML
            </button>
          </div>
        )}

        <div className={styles.divider}></div>

        {/* Formatting Controls */}
        {onFormat && (
          <div className={styles.formattingSection}>
            {/* Headings Row */}
            <div className={styles.compactActionButton}>
              <button className={styles.headerLabel} disabled>Header</button>
              <button className={`${styles.headerNumber} ${activeFormats.h1 ? styles.active : ''}`} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('h1'); }} title="Heading 1">1</button>
              <button className={`${styles.headerNumber} ${activeFormats.h2 ? styles.active : ''}`} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('h2'); }} title="Heading 2">2</button>
              <button className={`${styles.headerNumber} ${activeFormats.h3 ? styles.active : ''}`} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('h3'); }} title="Heading 3">3</button>
              <button className={`${styles.headerNumber} ${activeFormats.h4 ? styles.active : ''}`} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('h4'); }} title="Heading 4">4</button>
              <button className={`${styles.headerNumber} ${activeFormats.h5 ? styles.active : ''}`} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('h5'); }} title="Heading 5">5</button>
            </div>

            {/* Text Formatting & Lists Row */}
            <div className={styles.compactActionButton}>
              <button className={activeFormats.bold ? styles.active : ''} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('bold'); }} title="Bold">
                <strong>B</strong>
              </button>
              <button className={activeFormats.italic ? styles.active : ''} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('italic'); }} title="Italic">
                <em>I</em>
              </button>
              <button className={activeFormats.strikethrough ? styles.active : ''} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('strikethrough'); }} title="Strikethrough">
                <span style={{ textDecoration: 'line-through' }}>S</span>
              </button>
              <button className={styles.tableShadowButton}></button>
              <button className={activeFormats.ul ? styles.active : ''} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('ul'); }} title="Unordered List">•</button>
              <button className={activeFormats.ol ? styles.active : ''} onMouseDown={(e) => { e.preventDefault(); const editing = document.querySelector('[contenteditable="true"]') as HTMLDivElement; if (editing) editing.blur(); onFormat('ol'); }} title="Ordered List">1.</button>
            </div>
            
            {/* Table Row */}
            <div className={styles.compactActionButton}>
              <button onClick={() => onFormat('table')} title="Insert Table">Table</button>
              <button className={styles.tableShadowButton}></button>
              <button onClick={() => onFormat('table-add-row')} title="Add Row">+ Row</button>
              <button onClick={() => onFormat('table-add-col')} title="Add Column">+ Column</button>
            </div>
            
            {/* Components Row - Callout (dropdown), Quote, Codeblock, Card */}
            <div className={styles.compactActionButton}>
              {/* Callout Dropdown */}
              <div className={styles.dropdownWrapper} ref={calloutMenuRef}>
                <button
                  type="button"
                  className={`${styles.dropdownButton} ${showCalloutMenu ? styles.dropdownOpen : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowCalloutMenu(!showCalloutMenu)
                  }}
                  title="Insert Callout"
                >
                  Callout
                </button>
                {showCalloutMenu && (
                  <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                    <div
                      className={styles.dropdownItem}
                      data-callout="info"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onFormat) onFormat('callout-info')
                        setShowCalloutMenu(false)
                      }}
                    >
                      Info
                    </div>
                    <div
                      className={styles.dropdownItem}
                      data-callout="success"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onFormat) onFormat('callout-success')
                        setShowCalloutMenu(false)
                      }}
                    >
                      Success
                    </div>
                    <div
                      className={styles.dropdownItem}
                      data-callout="warning"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onFormat) onFormat('callout-warning')
                        setShowCalloutMenu(false)
                      }}
                    >
                      Warning
                    </div>
                    <div
                      className={styles.dropdownItem}
                      data-callout="error"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onFormat) onFormat('callout-error')
                        setShowCalloutMenu(false)
                      }}
                    >
                      Error
                    </div>
                    <div
                      className={styles.dropdownItem}
                      data-callout="custom"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onFormat) onFormat('callout-custom')
                        setShowCalloutMenu(false)
                      }}
                    >
                      Custom
                    </div>
                  </div>
                )}
              </div>

              {/* Quote */}
              <button type="button" onClick={() => onFormat && onFormat('quote')} title="Insert Quote">
                Quote
              </button>

              {/* Codeblock */}
              <button type="button" onClick={() => onFormat && onFormat('codeblock')} title="Insert Code Block">
                Code
              </button>

              {/* Card - placeholder for future */}
              <button type="button" onClick={() => onFormat && onFormat('card')} title="Insert Card (Coming Soon)">
                Card
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

              {(selectedLevel || currentClassificationLevel) && (
                <div
                  key={selectedLevel || currentClassificationLevel}
                  className={`${styles.stampOverlay} ${styles.stampCircle}`}
                  data-level={selectedLevel || currentClassificationLevel}
                >
                  <div className={styles.levelNumber}>{selectedLevel || currentClassificationLevel}</div>
                </div>
              )}
            </div>

            {/* Stamp Selection Row */}
            <div className={styles.stampTray}>
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  className={`${styles.stampCircle} ${(selectedLevel === null && currentClassificationLevel === level) || selectedLevel === level ? styles.used : ''}`}
                  data-level={level}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedLevel(level)
                    if (onMakeSecret && typeof level === 'number') {
                      onMakeSecret(level)
                    }
                    // Clear the stamp after animation (1.5 seconds)
                    setTimeout(() => setSelectedLevel(null), 1500)
                  }}
                  title={`Set as Level ${level} ${level === 1 ? '(Declassify to Public)' : 'classified'}`}
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