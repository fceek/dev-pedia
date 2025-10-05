import type { ContentBlock, BlockType } from '@/types/editor'
import { nanoid } from 'nanoid'

/**
 * Parse markdown text into structured content blocks
 */
export function parseContentToBlocks(markdownText: string): ContentBlock[] {
  if (!markdownText || markdownText.trim() === '') {
    return [createEmptyBlock()]
  }

  const lines = markdownText.split('\n')
  const blocks: ContentBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines between blocks
    if (line.trim() === '') {
      i++
      continue
    }

    // Callout: > [!type]
    if (line.match(/^>\s*\[!/)) {
      const { block, nextIndex } = parseCallout(lines, i)
      blocks.push(block)
      i = nextIndex
      continue
    }

    // Quote: > text
    if (line.startsWith('>') && !line.match(/^>\s*\[!/)) {
      const { block, nextIndex } = parseQuote(lines, i)
      blocks.push(block)
      i = nextIndex
      continue
    }

    // Code block: ```
    if (line.startsWith('```')) {
      const { block, nextIndex } = parseCodeBlock(lines, i)
      blocks.push(block)
      i = nextIndex
      continue
    }

    // Table: | ... |
    if (line.match(/^\|.*\|$/)) {
      const { block, nextIndex } = parseTable(lines, i)
      blocks.push(block)
      i = nextIndex
      continue
    }

    // Heading: # ... #####
    if (line.match(/^#{1,5}\s/)) {
      blocks.push(parseHeading(line))
      i++
      continue
    }

    // List: - or * or 1.
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const { block, nextIndex } = parseList(lines, i)
      blocks.push(block)
      i = nextIndex
      continue
    }

    // Inline secret placeholder (standalone)
    if (line.match(/^{{SECRET:[^}]+}}$/)) {
      blocks.push(parseSecret(line))
      i++
      continue
    }

    // Paragraph: everything else
    const { block, nextIndex } = parseParagraph(lines, i)
    blocks.push(block)
    i = nextIndex
  }

  // Ensure at least one block
  if (blocks.length === 0) {
    blocks.push(createEmptyBlock())
  }

  return blocks
}

/**
 * Serialize blocks back to markdown string
 */
export function serializeBlocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks
    .map(block => block.markdown)
    .join('\n\n')
    .trim()
}

// Block parsers

function parseCallout(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const calloutLines: string[] = []
  let i = startIndex

  // Collect all consecutive > lines
  while (i < lines.length && lines[i].startsWith('>')) {
    calloutLines.push(lines[i])
    i++
  }

  const markdown = calloutLines.join('\n')
  const calloutType = extractCalloutType(calloutLines[0])

  return {
    block: {
      id: nanoid(),
      markdown,
      html: '', // Will be populated by conversion function
      type: 'callout',
      isEditing: false,
      metadata: { calloutType }
    },
    nextIndex: i
  }
}

function parseQuote(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const quoteLines: string[] = []
  let i = startIndex

  // Collect all consecutive > lines (not callouts)
  while (i < lines.length && lines[i].startsWith('>') && !lines[i].match(/^>\s*\[!/)) {
    quoteLines.push(lines[i])
    i++
  }

  return {
    block: {
      id: nanoid(),
      markdown: quoteLines.join('\n'),
      html: '',
      type: 'quote',
      isEditing: false
    },
    nextIndex: i
  }
}

function parseCodeBlock(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const codeLines: string[] = [lines[startIndex]] // Include opening ```
  const language = lines[startIndex].replace(/^```/, '').trim()
  let i = startIndex + 1

  // Collect until closing ```
  while (i < lines.length && !lines[i].startsWith('```')) {
    codeLines.push(lines[i])
    i++
  }

  if (i < lines.length) {
    codeLines.push(lines[i]) // Include closing ```
    i++
  }

  return {
    block: {
      id: nanoid(),
      markdown: codeLines.join('\n'),
      html: '',
      type: 'codeblock',
      isEditing: false,
      metadata: { language: language || 'plaintext' }
    },
    nextIndex: i
  }
}

function parseTable(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const tableLines: string[] = []
  let i = startIndex

  // Collect all consecutive table lines
  while (i < lines.length && lines[i].match(/^\|.*\|$/)) {
    tableLines.push(lines[i])
    i++
  }

  return {
    block: {
      id: nanoid(),
      markdown: tableLines.join('\n'),
      html: '',
      type: 'table',
      isEditing: false
    },
    nextIndex: i
  }
}

function parseHeading(line: string): ContentBlock {
  const match = line.match(/^(#{1,5})\s/)
  const level = (match ? match[1].length : 1) as 1 | 2 | 3 | 4 | 5

  return {
    id: nanoid(),
    markdown: line,
    html: '',
    type: 'heading',
    isEditing: false,
    metadata: { headingLevel: level }
  }
}

function parseList(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const listLines: string[] = []
  let i = startIndex

  // Collect consecutive list items (including indented continuation)
  while (i < lines.length) {
    const line = lines[i]
    const isListItem = line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)
    const isIndented = line.match(/^\s+/) && listLines.length > 0

    if (isListItem || isIndented) {
      listLines.push(line)
      i++
    } else {
      break
    }
  }

  return {
    block: {
      id: nanoid(),
      markdown: listLines.join('\n'),
      html: '',
      type: 'list',
      isEditing: false
    },
    nextIndex: i
  }
}

function parseSecret(line: string): ContentBlock {
  return {
    id: nanoid(),
    markdown: line,
    html: '',
    type: 'secret',
    isEditing: false
  }
}

function parseParagraph(lines: string[], startIndex: number): { block: ContentBlock; nextIndex: number } {
  const paraLines: string[] = []
  let i = startIndex

  // Collect lines until blank line or special syntax
  while (i < lines.length) {
    const line = lines[i]

    // Stop at blank line
    if (line.trim() === '') break

    // Stop at start of special blocks
    if (
      line.startsWith('>') ||
      line.startsWith('```') ||
      line.match(/^\|.*\|$/) ||
      line.match(/^#{1,5}\s/) ||
      line.match(/^[-*]\s/) ||
      line.match(/^\d+\.\s/)
    ) {
      break
    }

    paraLines.push(line)
    i++
  }

  return {
    block: {
      id: nanoid(),
      markdown: paraLines.join('\n'),
      html: '',
      type: 'paragraph',
      isEditing: false
    },
    nextIndex: i
  }
}

// Utility functions

function createEmptyBlock(): ContentBlock {
  return {
    id: nanoid(),
    markdown: '',
    html: '',
    type: 'paragraph',
    isEditing: true // Start empty block in edit mode
  }
}

function extractCalloutType(line: string): 'info' | 'success' | 'warning' | 'error' | 'custom' {
  const match = line.match(/^>\s*\[!(\w+)\]/)
  if (!match) return 'info'

  const type = match[1].toLowerCase()
  if (['info', 'success', 'warning', 'error', 'custom'].includes(type)) {
    return type as 'info' | 'success' | 'warning' | 'error' | 'custom'
  }
  return 'custom'
}

/**
 * Create a new block of specific type with template markdown
 */
export function createBlockTemplate(type: BlockType): ContentBlock {
  const templates: Record<BlockType, string> = {
    paragraph: '',
    heading: '# Heading',
    list: '- List item',
    callout: '> [!info]\n> Your callout text here',
    table: '| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |',
    codeblock: '```javascript\n// Your code here\n```',
    quote: '> Your quote here',
    secret: '{{SECRET:key}}'
  }

  return {
    id: nanoid(),
    markdown: templates[type],
    html: '',
    type,
    isEditing: true // New blocks start in edit mode
  }
}
