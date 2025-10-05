'use client'

import { useRef, useEffect } from 'react'
import type { ContentBlock } from '@/types/editor'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './EditableBlock.module.css'

interface EditableBlockProps {
  block: ContentBlock
  onEdit: (blockId: string) => void
  onBlur: (blockId: string, newMarkdown: string) => void
  onKeyDown?: (blockId: string, e: React.KeyboardEvent) => void
  className?: string
}

export default function EditableBlock({
  block,
  onEdit,
  onBlur,
  onKeyDown,
  className = ''
}: EditableBlockProps) {
  const { isDark, getConditionalClass } = useTheme()
  const editableRef = useRef<HTMLDivElement>(null)

  // Focus the editable div when entering edit mode
  useEffect(() => {
    if (block.isEditing && editableRef.current) {
      editableRef.current.focus()

      // Place cursor at end of content
      const range = document.createRange()
      const selection = window.getSelection()

      if (editableRef.current.childNodes.length > 0) {
        const lastNode = editableRef.current.childNodes[editableRef.current.childNodes.length - 1]
        range.setStartAfter(lastNode)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }, [block.isEditing])

  const handleBlur = () => {
    if (editableRef.current) {
      const newMarkdown = editableRef.current.textContent || ''
      onBlur(block.id, newMarkdown)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(block.id, e)
    }
  }

  return (
    <div
      className={`
        ${styles.block}
        ${styles[block.type]}
        ${block.isEditing ? styles.editing : styles.display}
        ${getConditionalClass(styles, 'dark', isDark)}
        ${className}
      `}
      data-block-id={block.id}
      data-block-type={block.type}
    >
      {block.isEditing ? (
        // Edit mode: contenteditable with markdown text
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className={styles.editable}
          onFocus={() => onEdit(block.id)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        >
          {block.markdown}
        </div>
      ) : (
        // Display mode: rendered HTML
        <div
          className={styles.rendered}
          onMouseDown={(e) => {
            e.preventDefault()
            // Manually trigger blur on any currently editing block before switching
            const currentlyEditing = document.querySelector('[contenteditable="true"]') as HTMLDivElement
            if (currentlyEditing) {
              currentlyEditing.blur()
            }
            onEdit(block.id)
          }}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )}
    </div>
  )
}
