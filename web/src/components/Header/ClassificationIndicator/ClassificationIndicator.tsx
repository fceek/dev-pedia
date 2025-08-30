import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import styles from './ClassificationIndicator.module.css'

interface ClassificationIndicatorProps {
  level?: number
}

export default function ClassificationIndicator({ level = 0 }: ClassificationIndicatorProps) {
  const { logout, classificationLevel } = useAuth()
  const { isDark, isAdminTheme } = useTheme()
  const router = useRouter()
  const [circles, setCircles] = useState<boolean[]>([])
  const [animatingCircles, setAnimatingCircles] = useState<Set<number>>(new Set())
  const [isSwipingOut, setIsSwipingOut] = useState(false)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const prevLevelRef = useRef(level)
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  // Handle swipe-to-logout functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (classificationLevel === 0) return // No interaction when not logged in
    startXRef.current = e.clientX
    isDraggingRef.current = true
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || startXRef.current === null) return
    
    const deltaX = e.clientX - startXRef.current
    if (deltaX < -50) { // Swiped left by at least 50px
      startSwipeOutLogout()
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    startXRef.current = null
  }

  const startSwipeOutLogout = () => {
    if (isSwipingOut) return
    setIsSwipingOut(true)
    
    // Clear existing timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = []
    
    // Turn off lights from right to left (logout animation)
    for (let i = level - 1; i >= 0; i--) {
      const delay = (level - 1 - i) * 100
      
      const timeout = setTimeout(() => {
        setAnimatingCircles(prev => new Set([...prev, i]))
        setCircles(prev => {
          const updated = [...prev]
          updated[i] = false
          return updated
        })
        
        // Clear animation after 200ms
        const clearTimeout = setTimeout(() => {
          setAnimatingCircles(prev => {
            const updated = new Set(prev)
            updated.delete(i)
            return updated
          })
          
          // If this was the last light, perform logout
          if (i === 0) {
            setTimeout(() => {
              logout()
              router.push('/')
            }, 200)
          }
        }, 200)
        timeoutsRef.current.push(clearTimeout)
      }, delay)
      
      timeoutsRef.current.push(timeout)
    }
  }

  // Initialize circles
  useEffect(() => {
    if (circles.length === 0) {
      const initialCircles = Array(5).fill(false).map((_, i) => i < level)
      setCircles(initialCircles)
      prevLevelRef.current = level
    }
  }, [level, circles.length])

  // Handle level changes
  useEffect(() => {
    if (prevLevelRef.current !== level && circles.length === 5) {
      // Clear existing timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current = []
      
      const prevLevel = prevLevelRef.current
      
      if (level > prevLevel) {
        // Level increased - light up from left to right
        for (let i = prevLevel; i < level; i++) {
          const delay = (i - prevLevel) * 150
          
          const timeout = setTimeout(() => {
            setAnimatingCircles(prev => new Set([...prev, i]))
            setCircles(prev => {
              const updated = [...prev]
              updated[i] = true
              return updated
            })
            
            // Clear animation after 300ms
            const clearTimeout = setTimeout(() => {
              setAnimatingCircles(prev => {
                const updated = new Set(prev)
                updated.delete(i)
                return updated
              })
            }, 300)
            timeoutsRef.current.push(clearTimeout)
          }, delay)
          
          timeoutsRef.current.push(timeout)
        }
      } else {
        // Level decreased - turn off from right to left
        for (let i = prevLevel - 1; i >= level; i--) {
          const delay = (prevLevel - 1 - i) * 150
          
          const timeout = setTimeout(() => {
            setAnimatingCircles(prev => new Set([...prev, i]))
            setCircles(prev => {
              const updated = [...prev]
              updated[i] = false
              return updated
            })
            
            // Clear animation after 300ms
            const clearTimeout = setTimeout(() => {
              setAnimatingCircles(prev => {
                const updated = new Set(prev)
                updated.delete(i)
                return updated
              })
            }, 300)
            timeoutsRef.current.push(clearTimeout)
          }, delay)
          
          timeoutsRef.current.push(timeout)
        }
      }
      
      prevLevelRef.current = level
    }
  }, [level, circles.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  const getAdminThemeVars = () => {
    if (!isAdminTheme) return {}
    
    // Use global color palette
    if (isDark) {
      return {
        '--admin-color-1': 'var(--classification-1-dark)',
        '--admin-shadow-1': 'var(--classification-1-dark-shadow)',
        '--admin-color-2': 'var(--classification-2-dark)',
        '--admin-shadow-2': 'var(--classification-2-dark-shadow)',
        '--admin-color-3': 'var(--classification-3-dark)',
        '--admin-shadow-3': 'var(--classification-3-dark-shadow)',
        '--admin-color-4': 'var(--classification-4-dark)',
        '--admin-shadow-4': 'var(--classification-4-dark-shadow)',
        '--admin-color-5': 'var(--classification-5-dark)',
        '--admin-shadow-5': 'var(--classification-5-dark-shadow)'
      }
    } else {
      return {
        '--admin-color-1': 'var(--classification-1-light)',
        '--admin-shadow-1': 'var(--classification-1-light-shadow)',
        '--admin-color-2': 'var(--classification-2-light)',
        '--admin-shadow-2': 'var(--classification-2-light-shadow)',
        '--admin-color-3': 'var(--classification-3-light)',
        '--admin-shadow-3': 'var(--classification-3-light-shadow)',
        '--admin-color-4': 'var(--classification-4-light)',
        '--admin-shadow-4': 'var(--classification-4-light-shadow)',
        '--admin-color-5': 'var(--classification-5-light)',
        '--admin-shadow-5': 'var(--classification-5-light-shadow)'
      }
    }
  }

  const getCircleClassName = (index: number, isFilled: boolean) => {
    let className = `${styles.circle}`
    
    if (isFilled) {
      if (isAdminTheme) {
        // Use admin gradient classes for all circles in admin theme
        switch (index) {
          case 0: className += ` ${styles.filledAdmin1}`; break
          case 1: className += ` ${styles.filledAdmin2}`; break
          case 2: className += ` ${styles.filledAdmin3}`; break
          case 3: className += ` ${styles.filledAdmin4}`; break
          case 4: className += ` ${styles.filledAdmin5}`; break
          default: className += ` ${styles.filledNormal}`; break
        }
      } else {
        className += ` ${styles.filledNormal}`
      }
    }
    
    if (animatingCircles.has(index)) className += ` ${styles.animating}`
    
    return className
  }

  return (
    <div 
      className={`${styles.classificationIndicator} ${classificationLevel > 0 ? styles.interactive : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={getAdminThemeVars()}
    >
      {circles.map((isFilled, index) => (
        <div 
          key={index}
          className={getCircleClassName(index, isFilled)}
        />
      ))}
    </div>
  )
}