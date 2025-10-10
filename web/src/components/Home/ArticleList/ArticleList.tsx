'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ArticleList.module.css'

interface Article {
  id: string
  source_type: string
  title: string
  full_path: string
  classification_level: number
  status: string
  created_at: string
  tags?: Array<{ name: string; color: string }>
}

interface ArticleListProps {
  articles: Article[]
  isLoading?: boolean
}

export default function ArticleList({ articles, isLoading }: ArticleListProps) {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredArticles, setFilteredArticles] = useState<Article[]>(articles)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(articles)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.full_path.toLowerCase().includes(query)
    )
    setFilteredArticles(filtered)
  }, [searchQuery, articles])

  const handleArticleClick = (article: Article) => {
    router.push(`/demo?article=${article.source_type}/${article.id}`)
  }

  const renderStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={i < level ? styles.starFilled : styles.starEmpty}
      >
        ⭐
      </span>
    ))
  }

  const focusSearch = () => {
    searchInputRef.current?.focus()
  }

  // Expose focus method to parent
  useEffect(() => {
    ;(window as any).__focusArticleSearch = focusSearch
    return () => {
      delete (window as any).__focusArticleSearch
    }
  }, [])

  return (
    <div className={styles.articleList}>
      <div className={styles.header}>
        <h1 className={styles.title}>Articles</h1>
        <div className={styles.searchContainer}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search articles..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading articles...</div>
      ) : filteredArticles.length === 0 ? (
        <div className={styles.empty}>
          {searchQuery ? 'No articles match your search.' : 'No articles available.'}
        </div>
      ) : (
        <div className={styles.list}>
          {filteredArticles.map((article) => (
            <div
              key={`${article.source_type}-${article.id}`}
              className={styles.articleItem}
              onClick={() => handleArticleClick(article)}
            >
              <div className={styles.articleHeader}>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <div className={styles.stars}>
                  {renderStars(article.classification_level)}
                </div>
              </div>
              <div className={styles.articleMeta}>
                <span className={styles.path}>{article.full_path}</span>
                <span className={styles.source}>{article.source_type}</span>
              </div>
              {article.tags && article.tags.length > 0 && (
                <div className={styles.tags}>
                  {article.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className={styles.tag}
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
