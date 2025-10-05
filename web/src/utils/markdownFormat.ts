/**
 * Markdown formatting utilities for the article editor
 * Handles text transformations with cursor position preservation
 */

export interface SelectionState {
  start: number
  end: number
  selectedText: string
}

export interface FormatResult {
  newValue: string
  newCursorStart: number
  newCursorEnd: number
}

export interface ActiveFormats {
  bold: boolean
  italic: boolean
  strikethrough: boolean
  h1: boolean
  h2: boolean
  h3: boolean
  h4: boolean
  h5: boolean
  ul: boolean
  ol: boolean
}

/**
 * Detect what formatting is active at the current cursor/selection position
 * Uses regex matching similar to markdown renderers for accuracy
 */
export function detectActiveFormats(value: string, start: number, end: number): ActiveFormats {
  // Find current line for header/list detection
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', start)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
  const currentLine = value.substring(lineStart, actualLineEnd)

  // Get the line containing the cursor for inline format detection
  const textInLine = value.substring(lineStart, actualLineEnd)
  const cursorPosInLine = start - lineStart

  let isBold = false
  let isItalic = false
  let isStrikethrough = false

  // First, check for combined bold+italic: ***text***
  const boldItalicRegex = /\*\*\*(.+?)\*\*\*/g
  let boldItalicMatch
  while ((boldItalicMatch = boldItalicRegex.exec(textInLine)) !== null) {
    const matchStart = boldItalicMatch.index + 3 // After opening ***
    const matchEnd = boldItalicMatch.index + boldItalicMatch[0].length - 3 // Before closing ***
    if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
      isBold = true
      isItalic = true
      break
    }
  }

  // If not in bold+italic, check for bold only: **text**
  if (!isBold) {
    const boldRegex = /\*\*(.+?)\*\*/g
    let boldMatch
    while ((boldMatch = boldRegex.exec(textInLine)) !== null) {
      const matchStart = boldMatch.index + 2 // After opening **
      const matchEnd = boldMatch.index + boldMatch[0].length - 2 // Before closing **
      if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
        isBold = true
        break
      }
    }
  }

  // If not in bold+italic, check for italic only: *text* (but not ** or ***)
  if (!isItalic) {
    const italicRegex = /(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g
    let italicMatch
    while ((italicMatch = italicRegex.exec(textInLine)) !== null) {
      const matchStart = italicMatch.index + 1 // After opening *
      const matchEnd = italicMatch.index + italicMatch[0].length - 1 // Before closing *
      if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
        isItalic = true
        break
      }
    }
  }

  // Match all strikethrough regions: ~~text~~
  const strikeRegex = /~~(.+?)~~/g
  let strikeMatch
  while ((strikeMatch = strikeRegex.exec(textInLine)) !== null) {
    const matchStart = strikeMatch.index + 2 // After opening ~~
    const matchEnd = strikeMatch.index + strikeMatch[0].length - 2 // Before closing ~~
    if (cursorPosInLine >= matchStart && cursorPosInLine <= matchEnd) {
      isStrikethrough = true
      break
    }
  }

  return {
    bold: isBold,
    italic: isItalic,
    strikethrough: isStrikethrough,
    h1: currentLine.trimStart().startsWith('# '),
    h2: currentLine.trimStart().startsWith('## '),
    h3: currentLine.trimStart().startsWith('### '),
    h4: currentLine.trimStart().startsWith('#### '),
    h5: currentLine.trimStart().startsWith('##### '),
    ul: /^\s*[\-\*]\s/.test(currentLine),
    ol: /^\s*\d+\.\s/.test(currentLine)
  }
}

/**
 * Expand selection to include surrounding formatting markers for a specific format
 * Only expands to include the markers for the requested format type
 */
export function expandSelectionToIncludeFormatting(
  value: string,
  start: number,
  end: number,
  format?: 'bold' | 'italic' | 'strikethrough'
): { start: number; end: number; selectedText: string } {
  let newStart = start
  let newEnd = end

  if (!format) {
    // No specific format - return original selection
    return {
      start: newStart,
      end: newEnd,
      selectedText: value.substring(newStart, newEnd)
    }
  }

  // Only expand for the specific format requested
  if (format === 'bold') {
    // Check for *** (bold+italic) first - expand to ALL markers
    if (value.substring(newStart - 3, newStart) === '***' && value.substring(newEnd, newEnd + 3) === '***') {
      // For ***text***, expand to the full ***text*** and let applyWrapper handle it
      newStart = newStart - 3
      newEnd = newEnd + 3
    }
    // Otherwise check for ** (bold only)
    else if (value.substring(newStart - 2, newStart) === '**' && value.substring(newEnd, newEnd + 2) === '**') {
      newStart = newStart - 2
      newEnd = newEnd + 2
    }
  } else if (format === 'italic') {
    // Check for *** (bold+italic) first - expand to include ALL markers
    if (value.substring(newStart - 3, newStart) === '***' && value.substring(newEnd, newEnd + 3) === '***') {
      // For ***text***, we expand to the full ***text*** and let applyWrapper handle it
      newStart = newStart - 3
      newEnd = newEnd + 3
    }
    // Otherwise check for * (italic only) - but make sure it's not part of **
    else {
      const beforeStar = value.substring(newStart - 1, newStart)
      const afterStar = value.substring(newEnd, newEnd + 1)
      const beforeBeforeStar = newStart >= 2 ? value.substring(newStart - 2, newStart - 1) : ''
      const afterAfterStar = newEnd < value.length - 1 ? value.substring(newEnd + 1, newEnd + 2) : ''

      if (beforeStar === '*' && afterStar === '*' && beforeBeforeStar !== '*' && afterAfterStar !== '*') {
        newStart = newStart - 1
        newEnd = newEnd + 1
      }
    }
  } else if (format === 'strikethrough') {
    // Check for ~~ (strikethrough)
    if (value.substring(newStart - 2, newStart) === '~~' && value.substring(newEnd, newEnd + 2) === '~~') {
      newStart = newStart - 2
      newEnd = newEnd + 2
    }
  }

  return {
    start: newStart,
    end: newEnd,
    selectedText: value.substring(newStart, newEnd)
  }
}

/**
 * Apply markdown formatting to selected text or cursor position
 */
export function applyMarkdownFormat(
  value: string,
  selection: SelectionState,
  format: string
): FormatResult {
  const { start, end, selectedText } = selection
  const hasSelection = start !== end

  switch (format) {
    // Headers
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
      return applyHeader(value, selection, parseInt(format.charAt(1)))

    // Text formatting
    case 'bold':
      return applyWrapper(value, selection, '**', '**')
    case 'italic':
      return applyWrapper(value, selection, '*', '*')
    case 'strikethrough':
      return applyWrapper(value, selection, '~~', '~~')

    // Lists
    case 'ul':
      return applyList(value, selection, '- ')
    case 'ol':
      return applyList(value, selection, '1. ')

    // Tables
    case 'table':
      return insertTable(value, selection)
    case 'table-add-row':
      return addTableRow(value, selection)
    case 'table-add-col':
      return addTableColumn(value, selection)

    // Callouts
    case 'callout-info':
      return insertCallout(value, selection, 'info')
    case 'callout-success':
      return insertCallout(value, selection, 'success')
    case 'callout-warning':
      return insertCallout(value, selection, 'warning')
    case 'callout-error':
      return insertCallout(value, selection, 'error')
    case 'callout-custom':
      return insertCallout(value, selection, 'custom')

    // Quote and Code
    case 'quote':
      return insertQuote(value, selection)
    case 'codeblock':
      return insertCodeblock(value, selection)

    default:
      return { newValue: value, newCursorStart: start, newCursorEnd: end }
  }
}

/**
 * Apply header formatting (# prefix on line)
 */
function applyHeader(
  value: string,
  selection: SelectionState,
  level: number
): FormatResult {
  const { start, end } = selection
  const prefix = '#'.repeat(level) + ' '

  // Find the start of the current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', end)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd

  const currentLine = value.substring(lineStart, actualLineEnd)

  // Check if line already has header
  const headerMatch = currentLine.match(/^(#{1,5})\s/)
  let newLine: string
  let cursorOffset: number

  if (headerMatch) {
    // Replace existing header level
    newLine = currentLine.replace(/^#{1,5}\s/, prefix)
    cursorOffset = prefix.length - headerMatch[0].length
  } else {
    // Add new header
    newLine = prefix + currentLine
    cursorOffset = prefix.length
  }

  const newValue =
    value.substring(0, lineStart) + newLine + value.substring(actualLineEnd)

  return {
    newValue,
    newCursorStart: start + cursorOffset,
    newCursorEnd: end + cursorOffset
  }
}

/**
 * Apply wrapper formatting (bold, italic, strikethrough)
 * Supports nested formatting - you can apply bold AND italic
 */
function applyWrapper(
  value: string,
  selection: SelectionState,
  prefix: string,
  suffix: string
): FormatResult {
  const { start, end, selectedText } = selection

  if (start === end) {
    // No selection - insert wrapper at cursor
    const newValue = value.substring(0, start) + prefix + suffix + value.substring(end)
    return {
      newValue,
      newCursorStart: start + prefix.length,
      newCursorEnd: start + prefix.length
    }
  }

  // Special case: Handle ***text*** (bold+italic combination)
  // When removing bold (**) from ***text***, leave *text*
  // When removing italic (*) from ***text***, leave **text**
  if (selectedText.startsWith('***') && selectedText.endsWith('***') && selectedText.length > 6) {
    if (prefix === '**') {
      // Removing bold from bold+italic: ***text*** -> *text*
      const innerText = selectedText.substring(3, selectedText.length - 3)
      const newValue =
        value.substring(0, start) +
        '*' + innerText + '*' +
        value.substring(end)
      return {
        newValue,
        newCursorStart: start + 1,
        newCursorEnd: start + 1 + innerText.length
      }
    } else if (prefix === '*') {
      // Removing italic from bold+italic: ***text*** -> **text**
      const innerText = selectedText.substring(3, selectedText.length - 3)
      const newValue =
        value.substring(0, start) +
        '**' + innerText + '**' +
        value.substring(end)
      return {
        newValue,
        newCursorStart: start + 2,
        newCursorEnd: start + 2 + innerText.length
      }
    }
  }

  // Check if selected text starts and ends with this wrapper
  // This happens when expandSelectionToIncludeFormatting has already expanded to include the markers
  if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length) {
    // Remove wrapper (toggle off)
    const unwrapped = selectedText.substring(prefix.length, selectedText.length - suffix.length)
    const newValue =
      value.substring(0, start) +
      unwrapped +
      value.substring(end)
    return {
      newValue,
      newCursorStart: start,
      newCursorEnd: start + unwrapped.length
    }
  }

  // Add wrapper (allow nesting with other formats)
  const newValue =
    value.substring(0, start) +
    prefix +
    selectedText +
    suffix +
    value.substring(end)

  return {
    newValue,
    newCursorStart: start + prefix.length,
    newCursorEnd: end + prefix.length
  }
}

/**
 * Apply list formatting (bullet or numbered)
 */
function applyList(
  value: string,
  selection: SelectionState,
  prefix: string
): FormatResult {
  const { start, end } = selection

  // Find all lines in selection
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', end)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd

  const selectedLines = value.substring(lineStart, actualLineEnd).split('\n')

  // Check if all lines already have this list format
  const allHavePrefix = selectedLines.every(line => line.trim().startsWith(prefix.trim()))

  let newLines: string[]
  let cursorOffset: number

  if (allHavePrefix) {
    // Remove list formatting
    newLines = selectedLines.map(line => line.replace(new RegExp(`^\\s*${prefix.trim()}\\s*`), ''))
    cursorOffset = -prefix.length
  } else {
    // Add list formatting (numbered lists need sequential numbers)
    if (prefix === '1. ') {
      newLines = selectedLines.map((line, index) => {
        // Remove existing list markers (-, *, or numbers with .) but keep content
        const cleanedLine = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
        return `${index + 1}. ${cleanedLine}`
      })
    } else {
      newLines = selectedLines.map(line => {
        // Remove existing list markers (-, *, or numbers with .) but keep content
        const cleanedLine = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
        return `${prefix}${cleanedLine}`
      })
    }
    cursorOffset = prefix.length
  }

  const newText = newLines.join('\n')
  const newValue = value.substring(0, lineStart) + newText + value.substring(actualLineEnd)

  return {
    newValue,
    newCursorStart: start + cursorOffset,
    newCursorEnd: end + (newText.length - (actualLineEnd - lineStart))
  }
}

/**
 * Insert a markdown table template
 */
function insertTable(
  value: string,
  selection: SelectionState
): FormatResult {
  const { start, end } = selection

  const tableTemplate = `|  |  |  |\n| -------- | -------- | -------- |\n|  |  |  |\n|  |  |  |\n`

  const newValue =
    value.substring(0, start) +
    '\n' +
    tableTemplate +
    '\n' +
    value.substring(end)

  // Position cursor in the first cell (after the first |)
  const firstCellPos = start + 1 + 2 // +1 for newline, +2 for "| "

  return {
    newValue,
    newCursorStart: firstCellPos,
    newCursorEnd: firstCellPos
  }
}

/**
 * Add a row to the table at cursor position
 */
function addTableRow(
  value: string,
  selection: SelectionState
): FormatResult {
  const { start } = selection

  // Find current line (table row)
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', start)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
  const currentLine = value.substring(lineStart, actualLineEnd)

  // Check if in a table (contains |)
  if (!currentLine.includes('|')) {
    return { newValue: value, newCursorStart: start, newCursorEnd: start }
  }

  // Count columns by splitting on | and excluding the first and last empty strings
  // For "| cell1 | cell2 |", split gives ["", " cell1 ", " cell2 ", ""]
  // We want to count all cells between the outer pipes, including empty ones
  const parts = currentLine.split('|')
  const columnCount = parts.length - 2 // Exclude first and last empty strings

  // Create new row with empty cells
  const newRow = '\n| ' + Array(columnCount).fill(' ').join('|') + '|'

  const newValue =
    value.substring(0, actualLineEnd) +
    newRow +
    value.substring(actualLineEnd)

  return {
    newValue,
    newCursorStart: actualLineEnd + newRow.length,
    newCursorEnd: actualLineEnd + newRow.length
  }
}

/**
 * Add a column to the table at cursor position
 */
function addTableColumn(
  value: string,
  selection: SelectionState
): FormatResult {
  const { start } = selection

  // Find current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', start)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd
  const currentLine = value.substring(lineStart, actualLineEnd)

  if (!currentLine.includes('|')) {
    return { newValue: value, newCursorStart: start, newCursorEnd: start }
  }

  // Find table start - scan upwards until we find a non-table line
  let tableStart = lineStart
  let searchPos = lineStart - 2
  while (searchPos >= 0) {
    const prevLineStart = value.lastIndexOf('\n', searchPos) + 1
    const prevLineEnd = searchPos + 1
    const prevLine = value.substring(prevLineStart, prevLineEnd)

    if (!prevLine.includes('|')) break

    tableStart = prevLineStart
    searchPos = prevLineStart - 2
  }

  // Find table end - scan downwards until we find a non-table line
  let tableEnd = actualLineEnd
  let searchEnd = actualLineEnd + 1
  while (searchEnd < value.length) {
    const nextLineEnd = value.indexOf('\n', searchEnd)
    const actualNextLineEnd = nextLineEnd === -1 ? value.length : nextLineEnd
    const nextLine = value.substring(searchEnd, actualNextLineEnd)

    if (!nextLine.includes('|')) break

    tableEnd = actualNextLineEnd
    searchEnd = actualNextLineEnd + 1
  }

  const tableText = value.substring(tableStart, tableEnd)
  const tableLines = tableText.split('\n').filter(line => line.trim())

  // Add column to each row
  const newTableLines = tableLines.map((line, index) => {
    if (index === 1 && line.includes('---')) {
      // Separator row - add dashes before the final |
      return line.replace(/\|$/, '| -------- |')
    }
    // Regular row - add empty cell before the final |
    return line.replace(/\|$/, '|  |')
  })

  const newValue =
    value.substring(0, tableStart) +
    newTableLines.join('\n') +
    value.substring(tableEnd)

  // Calculate the difference in length to adjust cursor position
  const lengthDiff = newValue.length - value.length

  return {
    newValue,
    newCursorStart: start + lengthDiff,
    newCursorEnd: start + lengthDiff
  }
}

/**
 * Insert a callout/admonition block
 */
function insertCallout(
  value: string,
  selection: SelectionState,
  type: string
): FormatResult {
  const { start, end, selectedText } = selection

  const calloutText = selectedText || 'Your note here'
  const callout = `\n> [!${type}]\n> ${calloutText}\n`

  const newValue =
    value.substring(0, start) +
    callout +
    value.substring(end)

  return {
    newValue,
    newCursorStart: start + callout.length,
    newCursorEnd: start + callout.length
  }
}

/**
 * Insert a blockquote
 */
function insertQuote(
  value: string,
  selection: SelectionState
): FormatResult {
  const { start, end, selectedText } = selection

  // Find all lines in selection
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', end)
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd

  const selectedLines = value.substring(lineStart, actualLineEnd).split('\n')

  // Check if all lines already have quote prefix (> )
  const allHaveQuote = selectedLines.every(line => line.trimStart().startsWith('> '))

  let newLines: string[]
  let cursorOffset: number

  if (allHaveQuote) {
    // Remove quote formatting
    newLines = selectedLines.map(line => line.replace(/^(\s*)>\s/, '$1'))
    cursorOffset = -2 // Removed "> "
  } else {
    // Add quote formatting
    newLines = selectedLines.map(line => {
      // Preserve leading whitespace but add > before content
      const trimmedLine = line.trimStart()
      const leadingSpaces = line.substring(0, line.length - trimmedLine.length)
      return leadingSpaces + '> ' + trimmedLine
    })
    cursorOffset = 2 // Added "> "
  }

  const newText = newLines.join('\n')
  const newValue = value.substring(0, lineStart) + newText + value.substring(actualLineEnd)

  return {
    newValue,
    newCursorStart: start + cursorOffset,
    newCursorEnd: end + (newText.length - (actualLineEnd - lineStart))
  }
}

/**
 * Insert a code block
 */
function insertCodeblock(
  value: string,
  selection: SelectionState
): FormatResult {
  const { start, end, selectedText } = selection

  const codeContent = selectedText || 'your code here'
  const codeblock = `\n\`\`\`\n${codeContent}\n\`\`\`\n`

  const newValue =
    value.substring(0, start) +
    codeblock +
    value.substring(end)

  // Position cursor inside the code block (after the opening ``` and newline)
  const cursorPos = start + 5 // \n + ``` + \n

  return {
    newValue,
    newCursorStart: cursorPos,
    newCursorEnd: cursorPos + codeContent.length
  }
}
