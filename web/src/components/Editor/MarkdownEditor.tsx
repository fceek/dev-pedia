'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import LinkAutocomplete from './LinkAutocomplete'
import type { BrokenLink } from '@/types/graph'
import { applyMarkdownFormat, detectActiveFormats, expandSelectionToIncludeFormatting, type SelectionState, type ActiveFormats } from '@/utils/markdownFormat'
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
  onMakeSecret?: (makeSecretFn: (level: number) => void) => void
  onFormat?: (formatFn: (format: string) => void) => void
  onActiveFormatsChange?: (formats: ActiveFormats) => void
  onClassificationLevelChange?: (level: number | null) => void
  articleId?: string
  sourceType?: 'doc' | 'git'
}

export default function MarkdownEditor({
  value,
  onChange,
  secrets,
  onSecretsChange,
  placeholder = "Write your article content here...\n\nYou can select text and convert it to classified content using the toolbar above.",
  rows = 15,
  className = "",
  onMakeSecret,
  onFormat,
  onActiveFormatsChange,
  onClassificationLevelChange,
  articleId,
  sourceType
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { classificationLevel, user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()

  const [selectedText, setSelectedText] = useState('')
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)

  // Undo/Redo history - word-based grouping
  const [history, setHistory] = useState<string[]>([value])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef<string[]>([value])
  const historyIndexRef = useRef(0)
  const isUndoRedoRef = useRef(false)
  const needsTrimRef = useRef(false) // Flag to trim history on next edit after undo
  const pendingWordRef = useRef<string>(value) // Track the word being typed

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 })
  const [linkStartPosition, setLinkStartPosition] = useState(0)

  // Broken links state
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([])
  const [brokenLinkPositions, setBrokenLinkPositions] = useState<Set<string>>(new Set())

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

  // Keep historyRef in sync with history state
  useEffect(() => {
    historyRef.current = history
  }, [history])

  // Fetch broken links when article changes
  useEffect(() => {
    const fetchBrokenLinks = async () => {
      if (!articleId || !sourceType || !user?.token) {
        setBrokenLinks([])
        setBrokenLinkPositions(new Set())
        return
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/articles/${sourceType}/${articleId}/broken-links`,
          {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const links = data.broken_links || []
          setBrokenLinks(links)

          // Create a set of broken link texts for fast lookup
          const positions = new Set(links.map((link: BrokenLink) => link.link_text))
          setBrokenLinkPositions(positions)
        }
      } catch (error) {
        console.error('Failed to fetch broken links:', error)
      }
    }

    fetchBrokenLinks()
  }, [articleId, sourceType, user, value]) // Re-fetch when content changes

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selected = value.substring(start, end)

    // If cursor position changed significantly (like clicking to a different location),
    // save any pending word to history
    const positionChanged = Math.abs(start - selectionStart) > 1 || Math.abs(end - selectionEnd) > 1
    if (positionChanged && pendingWordRef.current !== value) {
      // Save the pending word before cursor moves
      setHistory(prev => {
        const currentIndex = historyIndexRef.current
        if (prev[currentIndex] === value) return prev
        const newHistory = prev.slice(0, currentIndex + 1)
        newHistory.push(value)
        if (newHistory.length > 100) {
          newHistory.shift()
          historyIndexRef.current = 99
          setHistoryIndex(99)
          historyRef.current = newHistory
          return newHistory
        }
        historyIndexRef.current = newHistory.length - 1
        setHistoryIndex(newHistory.length - 1)
        historyRef.current = newHistory
        return newHistory
      })
      pendingWordRef.current = value
    }

    setSelectedText(selected.trim())
    setSelectionStart(start)
    setSelectionEnd(end)

    // Detect and report active formats
    if (onActiveFormatsChange) {
      const activeFormats = detectActiveFormats(value, start, end)
      onActiveFormatsChange(activeFormats)
    }

    // Detect and report current classification level
    if (onClassificationLevelChange) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = value.indexOf('\n', start)
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
      const currentLine = value.substring(lineStart, actualLineEnd)
      const cursorPosInLine = start - lineStart

      // Check all classified blocks in the line
      const classifiedRegex = /{{([2-5]):([^}]+)}}/g
      let currentLevel: number | null = null
      let match
      while ((match = classifiedRegex.exec(currentLine)) !== null) {
        const matchStart = match.index
        const matchEnd = match.index + match[0].length

        // Check if cursor is inside this classified block
        if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
          currentLevel = parseInt(match[1])
          break
        }
      }
      onClassificationLevelChange(currentLevel)
    }
  }, [value, onActiveFormatsChange, onClassificationLevelChange, selectionStart, selectionEnd])

  // Wrapped onChange that tracks history
  const handleChange = useCallback((newValue: string, immediate = false) => {
    // Skip history tracking if this change came from undo/redo
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      pendingWordRef.current = newValue
      onChange(newValue)
      return
    }

    // Always call onChange immediately to update the UI
    onChange(newValue)

    // If we need to trim history (after undo), do it on first edit
    if (needsTrimRef.current) {
      needsTrimRef.current = false
      setHistory(prev => {
        const currentIndex = historyIndexRef.current
        const trimmedHistory = prev.slice(0, currentIndex + 1)
        historyRef.current = trimmedHistory
        return trimmedHistory
      })
    }

    // Detect if user just typed a word-ending character (space, punctuation, newline)
    const previousValue = pendingWordRef.current
    const diff = newValue.length - previousValue.length

    let shouldSaveToHistory = false
    let isBigChange = false

    if (immediate) {
      // Formatting operations always save immediately
      shouldSaveToHistory = true
    } else if (Math.abs(diff) > 1) {
      // Big change (paste, delete selection, drag-drop, etc.)
      // First, save the previous pending state if it's different from last history entry
      isBigChange = true
      shouldSaveToHistory = true
    } else if (diff === 1) {
      // Added one character - check if it's a word boundary
      const lastChar = newValue[newValue.length - 1]
      if (/[\s.,;:!?\n]/.test(lastChar)) {
        // Word boundary - save the word to history
        shouldSaveToHistory = true
      }
    } else if (diff === -1) {
      // Deleted one character (backspace) - check if we deleted a word boundary
      const deletedChar = previousValue[previousValue.length - 1]
      if (/[\s.,;:!?\n]/.test(deletedChar)) {
        // Deleted a word boundary - save current state
        shouldSaveToHistory = true
      }
    }

    if (shouldSaveToHistory) {
      setHistory(prev => {
        // CRITICAL: Detect if this is a batched call by checking if prev.length matches historyRef
        // During batching, React calls multiple setHistory callbacks with the same stale 'prev',
        // but historyRef.current gets updated by earlier batched calls
        const isBatchedCall = prev.length !== historyRef.current.length || prev !== historyRef.current
        const currentIndex = historyIndexRef.current

        // For batched calls, use historyRef (has latest updates); for normal calls, use prev
        const effectiveHistory = isBatchedCall ? historyRef.current : prev
        const effectiveIndex = isBatchedCall ? historyIndexRef.current : currentIndex

        // Check if this exact value is already at the effective position
        if (effectiveHistory[effectiveIndex] === newValue) {
          return prev
        }

        // Check if we need to save the previous pending state first (for big changes)
        let workingHistory = effectiveHistory
        let workingIndex = effectiveIndex

        if (isBigChange && previousValue && effectiveHistory[effectiveIndex] !== previousValue && previousValue !== newValue) {
          // Save the previous pending state as an intermediate step, but only if it's different from both current and new
          const tempHistory = effectiveHistory.slice(0, effectiveIndex + 1)
          tempHistory.push(previousValue)
          workingHistory = tempHistory
          workingIndex = tempHistory.length - 1
        }

        // Now save the new value if it's different from the last entry
        if (workingHistory[workingIndex] === newValue) {
          // Value is same as what we just added (shouldn't happen now, but safety check)
          if (workingHistory !== prev) {
            historyIndexRef.current = workingIndex
            setHistoryIndex(workingIndex)
            historyRef.current = workingHistory
            return workingHistory
          }
          return prev
        }

        // Remove any future history beyond current index and add new value
        const newHistory = workingHistory.slice(0, workingIndex + 1)
        newHistory.push(newValue)

        // Limit history to 100 entries
        if (newHistory.length > 100) {
          const excess = newHistory.length - 100
          newHistory.splice(0, excess)
          historyIndexRef.current = 99
          setHistoryIndex(99)
          historyRef.current = newHistory
          return newHistory
        }

        historyIndexRef.current = newHistory.length - 1
        setHistoryIndex(newHistory.length - 1)
        historyRef.current = newHistory
        return newHistory
      })
      pendingWordRef.current = newValue
    } else {
      // Just update the pending word (don't save to history yet)
      pendingWordRef.current = newValue
    }
  }, [onChange])

  // Detect [[ pattern and show autocomplete
  const handleInputChange = useCallback((newValue: string) => {
    handleChange(newValue)

    if (!textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart

    // Look backwards from cursor to find [[
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[')

    if (lastDoubleBracket !== -1) {
      // Check if there's a closing ]] between [[ and cursor
      const textBetween = textBeforeCursor.substring(lastDoubleBracket + 2)

      if (!textBetween.includes(']]')) {
        // We're inside a [[ ]] pair, show autocomplete
        const query = textBetween
        setAutocompleteQuery(query)
        setLinkStartPosition(lastDoubleBracket)
        setShowAutocomplete(true)

        // Calculate position for autocomplete dropdown
        const coords = getCaretCoordinates()
        setAutocompletePosition({
          top: coords.top + 20,
          left: coords.left
        })
      } else {
        setShowAutocomplete(false)
      }
    } else {
      setShowAutocomplete(false)
    }
  }, [handleChange])

  // Get caret coordinates for autocomplete positioning
  const getCaretCoordinates = () => {
    if (!textareaRef.current) return { top: 0, left: 0 }

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()

    // Approximate position (simplified)
    return {
      top: rect.top + 100,
      left: rect.left + 20
    }
  }

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((suggestion: any) => {
    if (!textareaRef.current) return

    const newValue =
      value.substring(0, linkStartPosition) +
      `[[${suggestion.title}]]` +
      value.substring(textareaRef.current.selectionStart)

    handleChange(newValue, true) // Immediate save for link insertion
    setShowAutocomplete(false)

    // Move cursor after the inserted link
    const newCursorPos = linkStartPosition + suggestion.title.length + 4
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos
        textareaRef.current.selectionEnd = newCursorPos
        textareaRef.current.focus()
      }
    }, 0)
  }, [value, linkStartPosition, onChange])

  // Store latest values in refs for stable callbacks
  const latestValuesRef = useRef({ value, selectedText, selectionStart, selectionEnd, secrets })
  useEffect(() => {
    latestValuesRef.current = { value, selectedText, selectionStart, selectionEnd, secrets }
  })

  // Convert selected text to secret (stable callback)
  // Similar to bold/italic, detects cursor position within classified blocks
  const handleCreateSecret = useCallback((level: number) => {
    // Guard against invalid level (null, undefined, or not a number)
    if (typeof level !== 'number' || level < 1 || level > 5) {
      return
    }

    const { value, selectedText, selectionStart, selectionEnd } = latestValuesRef.current

    if (!textareaRef.current) return

    // If no selection, check if cursor is inside a classified block
    if (!selectedText) {
      // Find the line containing the cursor
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
      const lineEnd = value.indexOf('\n', selectionStart)
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
      const currentLine = value.substring(lineStart, actualLineEnd)
      const cursorPosInLine = selectionStart - lineStart

      // Check all classified blocks in the line
      const classifiedRegex = /{{([2-5]):([^}]+)}}/g
      let match
      while ((match = classifiedRegex.exec(currentLine)) !== null) {
        const matchStart = match.index
        const matchEnd = match.index + match[0].length

        // Check if cursor is inside this classified block
        if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
          const existingLevel = parseInt(match[1])
          const innerContent = match[2]
          const absoluteStart = lineStart + matchStart
          const absoluteEnd = lineStart + matchEnd

          if (level === 1) {
            // Declassify: unwrap
            const newValue =
              value.substring(0, absoluteStart) +
              innerContent +
              value.substring(absoluteEnd)
            handleChange(newValue, true)
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = absoluteStart + innerContent.length
                textareaRef.current.selectionEnd = absoluteStart + innerContent.length
                textareaRef.current.focus()
              }
              // Declassified - no classification level
              if (onClassificationLevelChange) {
                onClassificationLevelChange(null)
              }
            }, 0)
          } else if (level !== existingLevel) {
            // Change level
            const newClassified = `{{${level}:${innerContent}}}`
            const newValue =
              value.substring(0, absoluteStart) +
              newClassified +
              value.substring(absoluteEnd)
            handleChange(newValue, true)
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = absoluteStart + newClassified.length
                textareaRef.current.selectionEnd = absoluteStart + newClassified.length
                textareaRef.current.focus()
              }
              // Manually trigger classification level detection with the new level
              if (onClassificationLevelChange) {
                onClassificationLevelChange(level)
              }
            }, 0)
          }
          return
        }
      }

      // Cursor not in a classified block and no selection - do nothing
      return
    }

    // Has selection - check if it's a classified block
    const existingMatch = selectedText.match(/^{{([2-5]):(.+)}}$/)

    if (existingMatch) {
      const existingLevel = parseInt(existingMatch[1])
      const innerContent = existingMatch[2]

      if (level === 1) {
        // Declassify: unwrap
        const newValue =
          value.substring(0, selectionStart) +
          innerContent +
          value.substring(selectionEnd)
        handleChange(newValue, true)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = selectionStart
            textareaRef.current.selectionEnd = selectionStart + innerContent.length
            textareaRef.current.focus()
          }
          // Declassified - no classification level
          if (onClassificationLevelChange) {
            onClassificationLevelChange(null)
          }
        }, 0)
      } else if (level !== existingLevel) {
        // Change level
        const newClassified = `{{${level}:${innerContent}}}`
        const newValue =
          value.substring(0, selectionStart) +
          newClassified +
          value.substring(selectionEnd)
        handleChange(newValue, true)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = selectionStart
            textareaRef.current.selectionEnd = selectionStart + newClassified.length
            textareaRef.current.focus()
          }
          // Manually trigger classification level detection with the new level
          if (onClassificationLevelChange) {
            onClassificationLevelChange(level)
          }
        }, 0)
      }
      return
    }

    // Selection is not classified - wrap it (but not for level 1)
    if (level === 1) {
      return
    }

    const newClassified = `{{${level}:${selectedText}}}`
    const newValue =
      value.substring(0, selectionStart) +
      newClassified +
      value.substring(selectionEnd)
    handleChange(newValue, true)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = selectionStart + 4 + level.toString().length // After "{{X:"
        textareaRef.current.selectionEnd = selectionStart + 4 + level.toString().length + selectedText.length
        textareaRef.current.focus()
      }
      // Wrapped new text - update classification level
      if (onClassificationLevelChange) {
        onClassificationLevelChange(level)
      }
    }, 0)
  }, [handleChange, onClassificationLevelChange])

  // Apply markdown formatting (stable callback)
  const handleFormat = useCallback((format: string) => {
    const { value, selectedText, selectionStart, selectionEnd } = latestValuesRef.current
    if (!textareaRef.current) return

    // Save any pending word before applying formatting
    if (pendingWordRef.current !== value) {
      setHistory(prev => {
        const currentIndex = historyIndexRef.current
        if (prev[currentIndex] === value) return prev
        const newHistory = prev.slice(0, currentIndex + 1)
        newHistory.push(value)
        if (newHistory.length > 100) {
          newHistory.shift()
          historyIndexRef.current = 99
          setHistoryIndex(99)
          historyRef.current = newHistory
          return newHistory
        }
        historyIndexRef.current = newHistory.length - 1
        setHistoryIndex(newHistory.length - 1)
        historyRef.current = newHistory
        return newHistory
      })
      pendingWordRef.current = value
    }

    // For inline formatting (bold, italic, strikethrough), expand selection to include existing markers
    let actualStart = selectionStart
    let actualEnd = selectionEnd
    let actualSelectedText = selectedText

    if (['bold', 'italic', 'strikethrough'].includes(format)) {
      const expanded = expandSelectionToIncludeFormatting(
        value,
        selectionStart,
        selectionEnd,
        format as 'bold' | 'italic' | 'strikethrough'
      )
      actualStart = expanded.start
      actualEnd = expanded.end
      actualSelectedText = expanded.selectedText
    }

    const selection: SelectionState = {
      start: actualStart,
      end: actualEnd,
      selectedText: actualSelectedText
    }

    const result = applyMarkdownFormat(value, selection, format)

    handleChange(result.newValue, true)

    // Update cursor position and selection state
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = result.newCursorStart
        textareaRef.current.selectionEnd = result.newCursorEnd
        textareaRef.current.focus()

        // Update the ref with new selection state
        const newSelectedText = result.newValue.substring(result.newCursorStart, result.newCursorEnd)
        latestValuesRef.current = {
          value: result.newValue,
          selectedText: newSelectedText,
          selectionStart: result.newCursorStart,
          selectionEnd: result.newCursorEnd,
          secrets: latestValuesRef.current.secrets
        }

        // Update component state as well
        setSelectedText(newSelectedText)
        setSelectionStart(result.newCursorStart)
        setSelectionEnd(result.newCursorEnd)

        // Update active formats
        if (onActiveFormatsChange) {
          const activeFormats = detectActiveFormats(result.newValue, result.newCursorStart, result.newCursorEnd)
          onActiveFormatsChange(activeFormats)
        }
      }
    }, 0)
  }, [handleChange, onActiveFormatsChange])

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
    handleChange(newValue, true) // Immediate save for secret deletion

    // Remove from secrets list
    onSecretsChange(secrets.filter(s => s.key !== secretKey))
  }



  // Expose handleCreateSecret to parent component (only once on mount or when callback changes)
  useEffect(() => {
    if (onMakeSecret) {
      onMakeSecret(handleCreateSecret)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMakeSecret])

  // Expose handleFormat to parent component (only once on mount or when callback changes)
  useEffect(() => {
    if (onFormat) {
      onFormat(handleFormat)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFormat])

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    // First, save any pending word that hasn't been saved yet
    const { value } = latestValuesRef.current
    let needsFlush = false

    if (pendingWordRef.current !== value) {
      needsFlush = true
      setHistory(prev => {
        const currentIndex = historyIndexRef.current
        if (prev[currentIndex] === value) return prev
        const newHistory = prev.slice(0, currentIndex + 1)
        newHistory.push(value)
        if (newHistory.length > 100) {
          newHistory.shift()
          historyIndexRef.current = 99
          setHistoryIndex(99)
          historyRef.current = newHistory
          return newHistory
        }
        historyIndexRef.current = newHistory.length - 1
        setHistoryIndex(newHistory.length - 1)
        historyRef.current = newHistory
        return newHistory
      })
      pendingWordRef.current = value
    }

    // Then perform the undo (use setTimeout to avoid setState during render)
    setTimeout(() => {
      const currentIndex = historyIndexRef.current
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1
        const valueToRestore = historyRef.current[newIndex]

        setHistory(prev => {
          // Keep full history for redo - just move the index
          historyIndexRef.current = newIndex
          setHistoryIndex(newIndex)
          needsTrimRef.current = true // Trim on next user edit
          pendingWordRef.current = valueToRestore
          return prev
        })

        // Call onChange completely outside setHistory
        // Set flag just before calling onChange so it's cleared quickly
        setTimeout(() => {
          isUndoRedoRef.current = true
          onChange(valueToRestore)
          // Clear flag immediately after onChange completes
          // This prevents the next user edit from being treated as undo/redo
          setTimeout(() => {
            isUndoRedoRef.current = false
          }, 0)
        }, 0)
      }
    }, 0)
  }, [onChange])

  const handleRedo = useCallback(() => {
    const currentIndex = historyIndexRef.current
    if (currentIndex < historyRef.current.length - 1) {
      const newIndex = currentIndex + 1
      const valueToRestore = historyRef.current[newIndex]

      setHistory(prev => {
        historyIndexRef.current = newIndex
        setHistoryIndex(newIndex)
        needsTrimRef.current = false // Don't trim when redoing
        pendingWordRef.current = valueToRestore
        return prev
      })

      // Call onChange completely outside setHistory
      // Set flag just before calling onChange so it's cleared quickly
      setTimeout(() => {
        isUndoRedoRef.current = true
        onChange(valueToRestore)
        // Clear flag immediately after onChange completes
        setTimeout(() => {
          isUndoRedoRef.current = false
        }, 0)
      }, 0)
    }
  }, [onChange])

  // Handle Enter key for list continuation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      handleRedo()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const cursorPos = textareaRef.current?.selectionStart || 0
      const { value } = latestValuesRef.current

      // Find current line
      const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1
      const lineEnd = value.indexOf('\n', cursorPos)
      const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
      const currentLine = value.substring(lineStart, actualLineEnd)

      // Check if current line is a list item
      const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)$/)
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/)

      if (bulletMatch) {
        const [, indent, bullet, content] = bulletMatch

        if (content.trim() === '') {
          // Empty list item - exit list mode
          e.preventDefault()
          const newValue =
            value.substring(0, lineStart) +
            indent +
            value.substring(actualLineEnd)
          handleChange(newValue, true) // Immediate save for list exit

          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = lineStart + indent.length
              textareaRef.current.selectionEnd = lineStart + indent.length
            }
          }, 0)
        } else {
          // Continue list with same bullet
          e.preventDefault()
          const newValue =
            value.substring(0, cursorPos) +
            '\n' + indent + bullet + ' ' +
            value.substring(cursorPos)
          handleChange(newValue, true) // Immediate save for list continuation

          setTimeout(() => {
            if (textareaRef.current) {
              const newCursorPos = cursorPos + 1 + indent.length + bullet.length + 1
              textareaRef.current.selectionStart = newCursorPos
              textareaRef.current.selectionEnd = newCursorPos
            }
          }, 0)
        }
      } else if (numberedMatch) {
        const [, indent, num, content] = numberedMatch

        if (content.trim() === '') {
          // Empty list item - exit list mode
          e.preventDefault()
          const newValue =
            value.substring(0, lineStart) +
            indent +
            value.substring(actualLineEnd)
          handleChange(newValue, true) // Immediate save for list exit

          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = lineStart + indent.length
              textareaRef.current.selectionEnd = lineStart + indent.length
            }
          }, 0)
        } else {
          // Continue numbered list with next number
          e.preventDefault()
          const nextNum = parseInt(num) + 1
          const newValue =
            value.substring(0, cursorPos) +
            '\n' + indent + nextNum + '. ' +
            value.substring(cursorPos)
          handleChange(newValue, true) // Immediate save for list continuation

          setTimeout(() => {
            if (textareaRef.current) {
              const newCursorPos = cursorPos + 1 + indent.length + String(nextNum).length + 2
              textareaRef.current.selectionStart = newCursorPos
              textareaRef.current.selectionEnd = newCursorPos
            }
          }, 0)
        }
      }
    }
  }, [handleChange, handleUndo, handleRedo])

  return (
    <div className={`${styles.editorContainer} ${getConditionalClass(styles, 'dark', isDark)} ${className}`}>

      {/* Editor */}
      <div className={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={value}
          onChange={(e) => {
            handleInputChange(e.target.value)
            // Trigger auto-resize on next frame to ensure DOM is updated
            setTimeout(autoResizeTextarea, 0)
          }}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
        />
        
        {/* Overlay for visual highlighting (secrets and broken links) */}
        <div ref={overlayRef} className={styles.highlightOverlay}>
          {value.split('\n').map((line, lineIndex) => (
            <div key={lineIndex} className={styles.line}>
              {line.split(/({{[2-5]:[^}]+}}|\[\[[^\]]+\]\])/).map((part, partIndex) => {
                // Handle secret placeholders - just color the text, no background
                const secretMatch = part.match(/{{([2-5]):([^}]+)}}/)
                if (secretMatch) {
                  const level = parseInt(secretMatch[1])
                  return (
                    <span
                      key={partIndex}
                      className={`${styles.secretText} ${styles[`level${level}Text`]}`}
                    >
                      {part}
                    </span>
                  )
                }

                // Handle wiki links (broken or valid)
                if (part.match(/\[\[[^\]]+\]\]/)) {
                  const isBroken = brokenLinkPositions.has(part)
                  if (isBroken) {
                    const brokenLink = brokenLinks.find(link => link.link_text === part)
                    return (
                      <span
                        key={partIndex}
                        className={styles.brokenLink}
                        title={brokenLink ? `Broken link: ${brokenLink.reason}` : 'Broken link'}
                      >
                        {part}
                      </span>
                    )
                  }
                  return (
                    <span key={partIndex} className={styles.validLink}>
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

      {/* Link Autocomplete */}
      {showAutocomplete && (
        <LinkAutocomplete
          query={autocompleteQuery}
          onSelect={handleAutocompleteSelect}
          onClose={() => setShowAutocomplete(false)}
          position={autocompletePosition}
        />
      )}

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

