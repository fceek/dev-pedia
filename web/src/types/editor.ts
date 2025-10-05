// Editor content block types

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'callout'
  | 'table'
  | 'codeblock'
  | 'quote'
  | 'secret'

export interface ContentBlock {
  id: string
  markdown: string      // Source of truth for editing
  html: string         // Rendered output for display
  type: BlockType
  isEditing: boolean   // Current edit state
  isSelected?: boolean // Block selection state for bulk operations
  metadata?: {
    headingLevel?: 1 | 2 | 3 | 4 | 5
    calloutType?: 'info' | 'success' | 'warning' | 'error' | 'custom'
    language?: string  // For code blocks
  }
}

export interface ArticleContent {
  blocks: ContentBlock[]
}
