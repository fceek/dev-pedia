'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  onLoginSuccess?: () => void
  onBack?: () => void
}

export default function LoginForm({ onLoginSuccess, onBack }: LoginFormProps) {
  const { login } = useAuth()
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // Fade in from center after mounting
    setTimeout(() => setIsVisible(true), 50)
  }, [])
  
  const handleBack = () => {
    if (!onBack) return
    
    setIsFadingOut(true)
    setTimeout(() => {
      onBack()
    }, 400) // Wait for fade animation to complete
  }

  const handleTokenLogin = async () => {
    if (!token.trim()) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const result = await login(token.trim())
      
      if (result.success) {
        // Trigger success callback which might navigate or update UI
        onLoginSuccess?.()
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login failed:', error)
      setError('Failed to validate token. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div 
      className={styles.loginForm}
      style={{
        opacity: isFadingOut ? 0 : (isVisible ? 1 : 0),
        transform: isFadingOut ? 'scale(0.9) translateZ(-50px)' : (isVisible ? 'scale(1) translateZ(0)' : 'scale(0.9) translateZ(0)'),
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
      }}
    >
      <div className={styles.formWrapper}>
        <div className={styles.formContent}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Access Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your access token..."
              className={styles.tokenInput}
              disabled={isLoading}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              onClick={handleTokenLogin}
              disabled={!token.trim() || isLoading}
              className={`${styles.button} ${styles.loginButton} ${(!token.trim() || isLoading) ? styles.disabled : ''}`}
            >
              {isLoading ? 'Validating...' : 'Login'}
            </button>
            
            {onBack && (
              <button
                onClick={handleBack}
                className={`${styles.button} ${styles.backButton}`}
              >
                Back
              </button>
            )}
          </div>

          {error && (
            <div className={styles.errorText}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.helpText}>
            <p>Enter your access token for classified access.</p>
          </div>
        </div>
      </div>
    </div>
  )
}