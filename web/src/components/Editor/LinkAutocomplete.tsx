'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './LinkAutocomplete.module.css'

interface ArticleSuggestion {
  id: string
  source_type: string
  title: string
  full_path: string
  classification_level: number
}

interface LinkAutocompleteProps {
  query: string
  onSelect: (suggestion: ArticleSuggestion) => void
  onClose: () => void
  position: { top: number; left: number }
}

export default function LinkAutocomplete({
  query,
  onSelect,
  onClose,
  position
}: LinkAutocompleteProps) {
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const token = user?.token
        if (!token) return

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/articles/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, user])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % suggestions.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
          break
        case 'Enter':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedIndex, onSelect, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (query.length < 2) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.autocomplete} ${getConditionalClass(styles, 'dark', isDark)}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {isLoading && (
        <div className={styles.loading}>Searching...</div>
      )}

      {!isLoading && suggestions.length === 0 && (
        <div className={styles.empty}>
          No articles found for "{query}"
        </div>
      )}

      {!isLoading && suggestions.length > 0 && (
        <div className={styles.suggestionsList}>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={styles.suggestionTitle}>
                {suggestion.title}
                <span className={`${styles.level} ${styles[`level${suggestion.classification_level}`]}`}>
                  L{suggestion.classification_level}
                </span>
              </div>
              <div className={styles.suggestionPath}>{suggestion.full_path}</div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        ↑↓ Navigate • Enter Select • Esc Close
      </div>
    </div>
  )
}
