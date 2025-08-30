import styles from './IndexActions.module.css'

import { useState, useEffect } from 'react'

interface IndexActionsProps {
  onLoginClick: () => void
  onGuestClick: () => void
}

export default function IndexActions({ onLoginClick, onGuestClick }: IndexActionsProps) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Fade in from outside the screen after mounting
    setTimeout(() => setIsVisible(true), 50)
  }, [])

  const handleLoginClick = () => {
    setIsFadingOut(true)
    
    setTimeout(() => {
      onLoginClick()
    }, 400) // Wait for fade animation to complete
  }

  const handleGuestClick = () => {
    onGuestClick() // Direct redirect to guest landing page
  }

  return (
    <div 
      className={styles.container}
      style={{
        opacity: isFadingOut ? 0 : (isVisible ? 1 : 0),
        transform: isFadingOut 
          ? 'scale(1.1) translateZ(50px)' 
          : isVisible 
            ? 'scale(1) translateZ(0)' 
            : 'scale(1.1) translateZ(50px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
      }}
    >
      <div 
        className={`${styles.square} ${styles.filled}`} 
        onClick={handleLoginClick}
      >
        Log in
      </div>
      <div 
        className={`${styles.square} ${styles.filled}`} 
        onClick={handleGuestClick}
      >
        Guest
      </div>
    </div>
  )
}