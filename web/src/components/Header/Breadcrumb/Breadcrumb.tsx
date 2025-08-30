'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './Breadcrumb.module.css'

interface BreadcrumbProps {
  items: string[]
  showLogo?: boolean
}

interface AnimatedItem {
  text: string
  key: string
  isAnimating: boolean
  isDivider: boolean
}

export default function Breadcrumb({ items, showLogo = true }: BreadcrumbProps) {
  const { getThemeClasses } = useTheme()
  const [animatedItems, setAnimatedItems] = useState<AnimatedItem[]>([])
  const [prevItems, setPrevItems] = useState<string[]>(items)
  const [removingItems, setRemovingItems] = useState<AnimatedItem[]>([])

  // Helper function to convert breadcrumb items to animated items with dividers
  const createAnimatedItems = (breadcrumbItems: string[], isAnimating: boolean = false): AnimatedItem[] => {
    const result: AnimatedItem[] = []
    breadcrumbItems.forEach((item, index) => {
      // Add the breadcrumb item
      result.push({
        text: item,
        key: `${item}-${index}`,
        isAnimating,
        isDivider: false
      })
      // Add divider after each item except the last
      if (index < breadcrumbItems.length - 1) {
        result.push({
          text: '<',
          key: `divider-${index}`,
          isAnimating,
          isDivider: true
        })
      }
    })
    return result
  }

  useEffect(() => {
    // Initialize on first render
    if (animatedItems.length === 0) {
      setAnimatedItems(createAnimatedItems(items))
      return
    }

    // Compare current items with previous items
    if (JSON.stringify(items) !== JSON.stringify(prevItems)) {
      // Create removing items for animation - need to extract from previous structure
      const removedItems = prevItems.filter(item => !items.includes(item))
      if (removedItems.length > 0) {
        const previousAnimatedItems = createAnimatedItems(prevItems)
        const tempRemovingItems: AnimatedItem[] = []
        
        // Find items that should be removed (both breadcrumbs and their dividers)
        previousAnimatedItems.forEach((prevItem) => {
          if (!prevItem.isDivider) {
            // If this breadcrumb item was removed
            if (!items.includes(prevItem.text)) {
              tempRemovingItems.push({ ...prevItem, isAnimating: false })
            }
          } else {
            // For dividers, check if they should be removed by looking at the structure
            const prevItemIndex = previousAnimatedItems.indexOf(prevItem)
            const prevBreadcrumbItem = previousAnimatedItems[prevItemIndex - 1]
            if (prevBreadcrumbItem && !items.includes(prevBreadcrumbItem.text)) {
              // This divider's preceding item was removed, so remove the divider too
              tempRemovingItems.push({ ...prevItem, isAnimating: false })
            }
          }
        })
        
        setRemovingItems(tempRemovingItems)
        
        // Clear removing items after animation
        setTimeout(() => {
          setRemovingItems([])
        }, 300)
      }

      // Determine which current items are new
      const newAnimatedItems = createAnimatedItems(items)
      newAnimatedItems.forEach(animatedItem => {
        if (!animatedItem.isDivider) {
          // Only breadcrumb items can be "new", dividers follow their items
          animatedItem.isAnimating = !prevItems.includes(animatedItem.text)
        } else {
          // Dividers animate if their preceding breadcrumb item is new
          const currentItemIndex = newAnimatedItems.indexOf(animatedItem)
          const precedingBreadcrumbItem = newAnimatedItems[currentItemIndex - 1]
          if (precedingBreadcrumbItem) {
            animatedItem.isAnimating = !prevItems.includes(precedingBreadcrumbItem.text)
          }
        }
      })
      
      setAnimatedItems(newAnimatedItems)

      // Clear animations after they complete
      setTimeout(() => {
        setAnimatedItems(createAnimatedItems(items))
      }, 300)

      setPrevItems(items)
    }
  }, [items, prevItems, animatedItems.length])

  return (
    <div className={`${styles.breadcrumb} ${getThemeClasses(styles)}`}>
      {/* Render removing items (they will fade out) */}
      {removingItems.map((removingItem) => (
        <span 
          key={removingItem.key}
          className={`${removingItem.isDivider ? styles.divider : styles.breadcrumbItem} ${styles.fadeOutToRight}`}
        >
          {removingItem.text}
        </span>
      ))}
      
      {/* Render current items */}
      {animatedItems.map((animatedItem) => (
        <span 
          key={animatedItem.key}
          className={`${animatedItem.isDivider ? styles.divider : styles.breadcrumbItem} ${
            animatedItem.isAnimating ? styles.fadeInFromRight : ''
          }`}
        >
          {animatedItem.text}
        </span>
      ))}
      
      {showLogo && (
        <>
          <span className={styles.divider}>&lt;</span>
          <div className={styles.logoText}>
            <div className={styles.logo}>
              <svg viewBox="0 0 72 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="5" y="20" fontSize="20" fontWeight="bold" fill="currentColor">&#123;DEV&#125;</text>
              </svg>
            </div>
            <span> PEDIA</span>
          </div>
        </>
      )}
    </div>
  )
}