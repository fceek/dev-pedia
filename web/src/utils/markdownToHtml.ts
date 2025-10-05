import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import type { ContentBlock } from '@/types/editor'

/**
 * Convert markdown string to HTML with custom syntax support
 */
export function convertMarkdownToHtml(
  markdown: string,
  classificationLevel: number = 5
): string {
  // Pre-process inline classification syntax
  const processedMarkdown = processInlineClassification(markdown, classificationLevel)

  // Convert markdown to HTML using remark
  const result = remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false }) // We trust our own content
    .processSync(processedMarkdown)

  let html = String(result)

  // Post-process for callouts
  html = processCallouts(html)

  // Post-process for wiki links
  html = processWikiLinks(html)

  return html.trim()
}

/**
 * Process inline classification syntax {{level:content}}
 */
function processInlineClassification(
  markdown: string,
  userClassificationLevel: number
): string {
  return markdown.replace(
    /\{\{(\d):([^}]+)\}\}/g,
    (match, level, content) => {
      const secretLevel = parseInt(level, 10)

      if (secretLevel > userClassificationLevel) {
        return `<span class="secret-classified level-${secretLevel}">[CLASSIFIED - Level ${secretLevel}]</span>`
      }

      return `<span class="secret-text level-${secretLevel}">${content}</span>`
    }
  )
}

/**
 * Process callout blocks > [!type]
 */
function processCallouts(html: string): string {
  // Match blockquote with callout syntax
  return html.replace(
    /<blockquote>\s*<p>\[!(\w+)\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/g,
    (match, type, content) => {
      const calloutType = type.toLowerCase()
      return `<blockquote data-callout="${calloutType}"><p>${content.trim()}</p></blockquote>`
    }
  )
}

/**
 * Process wiki link syntax [[link]]
 */
function processWikiLinks(html: string): string {
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    (match, linkText) => {
      // Convert to internal link format
      const slug = linkText.toLowerCase().replace(/\s+/g, '-')
      return `<a href="/docs/${slug}" class="wiki-link">${linkText}</a>`
    }
  )
}

/**
 * Process SECRET placeholder {{SECRET:key}}
 */
export function processSecretPlaceholders(
  markdown: string,
  secrets: Array<{ key: string; content: string; classificationLevel: number }>,
  userClassificationLevel: number
): string {
  return markdown.replace(
    /\{\{SECRET:([^}]+)\}\}/g,
    (match, key) => {
      const secret = secrets.find(s => s.key === key)

      if (!secret) {
        return `<span class="secret-classified">[MISSING SECRET: ${key}]</span>`
      }

      if (secret.classificationLevel > userClassificationLevel) {
        return `<span class="secret-classified level-${secret.classificationLevel}">[CLASSIFIED - Level ${secret.classificationLevel}]</span>`
      }

      return `<span class="secret-text level-${secret.classificationLevel}">${secret.content}</span>`
    }
  )
}

/**
 * Update block with converted HTML
 */
export function convertBlockToHtml(
  block: ContentBlock,
  classificationLevel: number = 5
): ContentBlock {
  const html = convertMarkdownToHtml(block.markdown, classificationLevel)

  return {
    ...block,
    html
  }
}

/**
 * Batch convert all blocks to HTML
 */
export function convertBlocksToHtml(
  blocks: ContentBlock[],
  classificationLevel: number = 5
): ContentBlock[] {
  return blocks.map(block => convertBlockToHtml(block, classificationLevel))
}
