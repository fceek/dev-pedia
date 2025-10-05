'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { ContentBlock } from '@/types/editor'
import { parseContentToBlocks, serializeBlocksToMarkdown, createBlockTemplate } from '@/utils/blockParser'
import { convertBlockToHtml, convertBlocksToHtml } from '@/utils/markdownToHtml'
import EditableBlock from './EditableBlock'
import BlockNumber from './BlockNumber'
import styles from './BlockEditor.module.css'

interface BlockEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  onFormat?: (formatFn: (format: string) => void) => void
  onActiveBlockChange?: (blockType: string, metadata?: any) => void
  onSelectedBlocksChange?: (count: number) => void
  onBlockAction?: (actionFn: () => void) => void
}

export default function BlockEditor({
  value,
  onChange,
  className = '',
  onFormat,
  onActiveBlockChange,
  onSelectedBlocksChange,
  onBlockAction
}: BlockEditorProps) {
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()

  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize blocks from markdown value
  useEffect(() => {
    const parsedBlocks = parseContentToBlocks(value)
    const blocksWithHtml = convertBlocksToHtml(parsedBlocks, classificationLevel)
    setBlocks(blocksWithHtml)
    setIsInitialized(true)
  }, []) // Only on mount

  // Notify parent of selected blocks count
  useEffect(() => {
    const selectedCount = blocks.filter(b => b.isSelected).length
    if (onSelectedBlocksChange) {
      onSelectedBlocksChange(selectedCount)
    }
  }, [blocks, onSelectedBlocksChange])

  // Handle block selection toggle
  const handleBlockSelect = useCallback((blockId: string, isSelected: boolean) => {
    setBlocks(prev => {
      const updatedBlocks = prev.map(block => {
        if (block.id === blockId) {
          return { ...block, isSelected }
        }
        return block
      })
      return updatedBlocks
    })
  }, [])

  // Delete selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    setBlocks(prev => {
      const unselectedBlocks = prev.filter(b => !b.isSelected)

      // Prevent deleting all blocks
      if (unselectedBlocks.length === 0) {
        return prev
      }

      // Trigger onChange
      if (isInitialized) {
        setTimeout(() => {
          const markdown = serializeBlocksToMarkdown(unselectedBlocks)
          onChange(markdown)
        }, 0)
      }

      return unselectedBlocks
    })
  }, [isInitialized, onChange])

  // Expose delete function to parent via onBlockAction
  useEffect(() => {
    if (onBlockAction) {
      onBlockAction(deleteSelectedBlocks)
    }
  }, [onBlockAction])

  // Handle block edit
  const handleBlockEdit = useCallback((blockId: string) => {
    setBlocks(prev => {
      const updatedBlocks = prev.map(block => {
        if (block.id === blockId) {
          return { ...block, isEditing: true }
        } else if (block.isEditing) {
          // Save currently editing block before switching
          const editableDiv = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`) as HTMLDivElement
          const currentText = editableDiv?.textContent ?? ''

          if (currentText.trim() === '') {
            // Empty block - show placeholder
            return {
              ...block,
              markdown: '',
              html: '<p class="empty-placeholder">Click to edit...</p>',
              isEditing: false
            }
          }

          // Save and convert to HTML
          const updatedBlock = convertBlockToHtml(
            { ...block, markdown: currentText, isEditing: false },
            classificationLevel
          )
          return updatedBlock
        }
        return block
      })

      // Trigger onChange for saved block
      if (isInitialized) {
        setTimeout(() => {
          const markdown = serializeBlocksToMarkdown(updatedBlocks)
          onChange(markdown)
        }, 0)
      }

      return updatedBlocks
    })

    setEditingBlockId(blockId)

    // Notify parent of active block change
    const activeBlock = blocks.find(b => b.id === blockId)
    if (activeBlock && onActiveBlockChange) {
      onActiveBlockChange(activeBlock.type, activeBlock.metadata)
    }
  }, [blocks, onActiveBlockChange, classificationLevel, isInitialized, onChange])

  // Handle block blur (exit edit mode)
  const handleBlockBlur = useCallback((blockId: string, newMarkdown: string) => {
    setBlocks(prev => {
      const updatedBlocks = prev.map(block => {
        if (block.id === blockId) {
          // If block is empty, use placeholder HTML
          if (newMarkdown.trim() === '') {
            return {
              ...block,
              markdown: '',
              html: '<p class="empty-placeholder">Click to edit...</p>',
              isEditing: false
            }
          }

          const updatedBlock = convertBlockToHtml(
            { ...block, markdown: newMarkdown, isEditing: false },
            classificationLevel
          )
          return updatedBlock
        }
        return block
      })

      // Defer onChange to avoid render-during-render error
      if (isInitialized) {
        setTimeout(() => {
          const markdown = serializeBlocksToMarkdown(updatedBlocks)
          onChange(markdown)
        }, 0)
      }

      return updatedBlocks
    })

    setEditingBlockId(null)
  }, [classificationLevel, onChange, isInitialized])

  // Apply inline formatting (bold, italic, strikethrough)
  const applyInlineFormat = useCallback((format: 'bold' | 'italic' | 'strikethrough') => {
    if (!editingBlockId) return

    const editableDiv = document.querySelector(`[data-block-id="${editingBlockId}"] [contenteditable]`) as HTMLDivElement
    if (!editableDiv) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    // Get full text and calculate positions
    const fullText = editableDiv.textContent || ''
    const beforeText = editableDiv.textContent?.substring(0, range.startOffset) || ''
    const afterText = editableDiv.textContent?.substring(range.endOffset) || ''

    // Determine syntax markers
    const markers = {
      bold: '**',
      italic: '*',
      strikethrough: '~~'
    }
    const marker = markers[format]

    let newText: string
    let newCursorPos: number

    if (selectedText) {
      // Check if selection is already formatted
      const isAlreadyFormatted =
        beforeText.endsWith(marker) && afterText.startsWith(marker)

      if (isAlreadyFormatted) {
        // Remove formatting
        newText = beforeText.slice(0, -marker.length) + selectedText + afterText.slice(marker.length)
        newCursorPos = beforeText.length - marker.length + selectedText.length
      } else {
        // Add formatting
        newText = beforeText + marker + selectedText + marker + afterText
        newCursorPos = beforeText.length + marker.length + selectedText.length + marker.length
      }
    } else {
      // No selection - insert markers at cursor
      const cursorPos = range.startOffset
      newText = fullText.slice(0, cursorPos) + marker + marker + fullText.slice(cursorPos)
      newCursorPos = cursorPos + marker.length
    }

    // Update the block
    setBlocks(prev => {
      const updatedBlocks = prev.map(block => {
        if (block.id === editingBlockId) {
          return { ...block, markdown: newText }
        }
        return block
      })
      return updatedBlocks
    })

    // Update DOM and restore cursor
    setTimeout(() => {
      editableDiv.textContent = newText

      // Restore cursor position
      const newRange = document.createRange()
      const sel = window.getSelection()

      if (editableDiv.firstChild) {
        newRange.setStart(editableDiv.firstChild, Math.min(newCursorPos, newText.length))
        newRange.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(newRange)
      }
    }, 0)
  }, [editingBlockId])

  // Handle Enter key - create new block
  const handleKeyDown = useCallback((blockId: string, e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts for formatting
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault()
        applyInlineFormat('bold')
        return
      }
      if (e.key === 'i') {
        e.preventDefault()
        applyInlineFormat('italic')
        return
      }
      if (e.key === 'x') {
        e.preventDefault()
        applyInlineFormat('strikethrough')
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const blockIndex = blocks.findIndex(b => b.id === blockId)
      if (blockIndex === -1) return

      // Create new paragraph block
      const newBlock = createBlockTemplate('paragraph')

      setBlocks(prev => {
        const newBlocks = [
          ...prev.slice(0, blockIndex + 1),
          newBlock,
          ...prev.slice(blockIndex + 1)
        ]
        return newBlocks
      })

      // Focus new block after render
      setTimeout(() => {
        handleBlockEdit(newBlock.id)
      }, 0)
    }

    // Handle Backspace on empty block - delete block
    if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId)

      // Check if contenteditable div is empty
      const target = e.currentTarget as HTMLDivElement
      const isEmpty = !target.textContent || target.textContent.trim() === ''

      if (block && isEmpty && blocks.length > 1) {
        e.preventDefault()

        const blockIndex = blocks.findIndex(b => b.id === blockId)
        const prevBlock = blocks[blockIndex - 1]

        setBlocks(prev => prev.filter(b => b.id !== blockId))

        // Focus previous block
        if (prevBlock) {
          setTimeout(() => {
            handleBlockEdit(prevBlock.id)
          }, 0)
        }
      }
    }
  }, [blocks, handleBlockEdit, applyInlineFormat])

  // Insert new block (for toolbar actions like callout, table, etc.)
  const insertBlock = useCallback((type: ContentBlock['type']) => {
    const newBlock = createBlockTemplate(type)
    const currentIndex = editingBlockId
      ? blocks.findIndex(b => b.id === editingBlockId)
      : blocks.length - 1

    setBlocks(prev => {
      const newBlocks = [
        ...prev.slice(0, currentIndex + 1),
        newBlock,
        ...prev.slice(currentIndex + 1)
      ]
      return newBlocks
    })

    // Focus new block
    setTimeout(() => {
      handleBlockEdit(newBlock.id)
    }, 0)
  }, [blocks, editingBlockId, handleBlockEdit])

  // Toggle heading on current block
  const toggleHeading = useCallback((level: 1 | 2 | 3 | 4 | 5) => {
    if (!editingBlockId) return

    setBlocks(prev => {
      const updatedBlocks = prev.map(block => {
        if (block.id === editingBlockId) {
          // Get current text from contenteditable
          const editableDiv = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`) as HTMLDivElement
          const currentText = editableDiv?.textContent || block.markdown

          // Check if block is currently this heading
          const isCurrentHeading = block.type === 'heading' && block.metadata?.headingLevel === level

          if (isCurrentHeading) {
            // Toggle back to paragraph
            const plainText = currentText.replace(/^#{1,5}\s+/, '').trim()

            // If no text after removing heading syntax, keep as empty paragraph
            if (!plainText) {
              return {
                ...block,
                markdown: '',
                html: '<p class="empty-placeholder">Click to edit...</p>',
                type: 'paragraph',
                metadata: {}
              }
            }

            return convertBlockToHtml(
              { ...block, markdown: plainText, type: 'paragraph', metadata: {} },
              classificationLevel
            )
          } else if (block.type === 'heading' || block.type === 'paragraph') {
            // Convert to the clicked heading level
            const plainText = currentText.replace(/^#{1,5}\s+/, '').trim()

            // Don't create heading if there's no actual text
            if (!plainText) {
              return block // Keep as-is
            }

            const headingMarkdown = `${'#'.repeat(level)} ${plainText}`
            return convertBlockToHtml(
              { ...block, markdown: headingMarkdown, type: 'heading', metadata: { headingLevel: level } },
              classificationLevel
            )
          }
        }
        return block
      })

      // Trigger onChange
      if (isInitialized) {
        setTimeout(() => {
          const markdown = serializeBlocksToMarkdown(updatedBlocks)
          onChange(markdown)
        }, 0)
      }

      return updatedBlocks
    })

    // Update active block notification
    setTimeout(() => {
      const activeBlock = blocks.find(b => b.id === editingBlockId)
      if (activeBlock && onActiveBlockChange) {
        const isCurrentHeading = activeBlock.type === 'heading' && activeBlock.metadata?.headingLevel === level
        if (isCurrentHeading) {
          onActiveBlockChange('paragraph', {})
        } else {
          onActiveBlockChange('heading', { headingLevel: level })
        }
      }
    }, 0)
  }, [editingBlockId, blocks, classificationLevel, isInitialized, onChange, onActiveBlockChange])

  // Expose insert block, heading toggle, and inline formatting to parent via onFormat
  useEffect(() => {
    if (onFormat) {
      const formatHandler = (format: string) => {
        // Handle heading toggles
        if (format === 'h1') toggleHeading(1)
        else if (format === 'h2') toggleHeading(2)
        else if (format === 'h3') toggleHeading(3)
        else if (format === 'h4') toggleHeading(4)
        else if (format === 'h5') toggleHeading(5)
        // Handle inline formatting
        else if (format === 'bold') applyInlineFormat('bold')
        else if (format === 'italic') applyInlineFormat('italic')
        else if (format === 'strikethrough') applyInlineFormat('strikethrough')
        // Handle block insertion
        else if (format === 'callout-info' || format.startsWith('callout-')) {
          insertBlock('callout')
        } else if (format === 'table') {
          insertBlock('table')
        } else if (format === 'codeblock') {
          insertBlock('codeblock')
        } else if (format === 'quote') {
          insertBlock('quote')
        } else if (format === 'card') {
          // Card is wiki link, insert as paragraph
          insertBlock('paragraph')
        }
      }

      onFormat(formatHandler)
    }
  }, [onFormat, insertBlock, toggleHeading, applyInlineFormat])

  return (
    <div className={`${styles.blockEditor} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>
      <div className={`${styles.blocksContainer} ${getConditionalClass(styles, 'dark', isDark)}`}>
        {blocks.map((block, index) => (
          <React.Fragment key={block.id}>
            <BlockNumber
              blockNumber={index + 1}
              isSelected={block.isSelected || false}
              onSelect={(isSelected) => handleBlockSelect(block.id, isSelected)}
            />
            <EditableBlock
              block={block}
              onEdit={handleBlockEdit}
              onBlur={handleBlockBlur}
              onKeyDown={handleKeyDown}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
