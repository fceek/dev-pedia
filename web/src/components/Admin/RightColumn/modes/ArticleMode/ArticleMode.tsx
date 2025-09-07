'use client'

import RightColumnLayout from '../../shared/RightColumnLayout'
import CurrentSection from './CurrentSection'
import ArticleMetrics from './ArticleMetrics'
import ArticleActions from './ArticleActions'

interface ArticleModeProps {
  data?: any
  transitionKey?: string
}

export default function ArticleMode({ data, transitionKey = 'article' }: ArticleModeProps) {
  const treeSections = [
    {
      id: 'current-section',
      content: <CurrentSection data={data} />
    },
    {
      id: 'metrics',
      content: <ArticleMetrics data={data} />
    }
  ]

  const handleFormat = (format: string) => {
    console.log('Format action:', format)
    // TODO: Implement actual formatting logic
  }

  return (
    <RightColumnLayout
      treeSections={treeSections}
      bottomContent={<ArticleActions onFormat={handleFormat} />}
      transitionKey={transitionKey}
    />
  )
}