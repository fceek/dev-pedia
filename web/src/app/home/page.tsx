'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout/Layout'
import ArticleList from '@/components/Home/ArticleList/ArticleList'
import QuickActions from '@/components/Home/QuickActions/QuickActions'

export default function HomePage() {
  const router = useRouter()
  const { user, classificationLevel, isLoading: authLoading } = useAuth()
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchArticles()
    }
  }, [user, classificationLevel])

  const fetchArticles = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/articles?page=1&page_size=50`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchFocus = () => {
    if ((window as any).__focusArticleSearch) {
      (window as any).__focusArticleSearch()
    }
  }

  // Don't render anything while checking authentication
  if (authLoading || !user) {
    return null
  }

  return (
    <Layout
      leftColumn={<ArticleList articles={articles} isLoading={isLoading} />}
      rightColumn={<QuickActions onSearchFocus={handleSearchFocus} />}
      breadcrumbs={['Home']}
      author="Fceek@London"
      year={2025}
      gridRatio="3fr 1fr"
    />
  )
}
