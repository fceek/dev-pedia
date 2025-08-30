'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  token: string
  classificationLevel: number
  name?: string
  expiresAt?: string
  createdBy?: string
  createdByName?: string
  description?: string
  lastUsedAt?: string
  tokenId?: string
}

// Classification level helpers
export const CLASSIFICATION_LEVELS = {
  1: { name: '1-Star', canCreate: false },
  2: { name: '2-Star', canCreate: false },
  3: { name: '3-Star', canCreate: false },
  4: { name: '4-Star', canCreate: true },
  5: { name: '5-Star', canCreate: true },
} as const

export type ClassificationLevel = keyof typeof CLASSIFICATION_LEVELS

interface AuthContextType {
  user: User | null
  classificationLevel: number
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => Promise<{ success: boolean; error?: string }>
  guestLogin: () => void
  logout: () => void
  validateToken: () => Promise<boolean>
  loadUserDetails: () => Promise<void>
  loadTokenStats: () => Promise<{ created: number; maxAllowed: number; canCreate: boolean } | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Auto-sync classification level
  const classificationLevel = user?.classificationLevel || 0

  const validateToken = async (token: string): Promise<{ valid: boolean; user?: User; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        return { valid: false, error: 'Invalid token' }
      }

      const data = await response.json()
      return {
        valid: true,
        user: {
          token,
          classificationLevel: data.classification_level,
          name: data.name,
          expiresAt: data.expires_at
        }
      }
    } catch (error) {
      console.error('Token validation error:', error)
      return { valid: false, error: 'Network error' }
    }
  }

  const login = async (token: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    
    const result = await validateToken(token)
    
    if (result.valid && result.user) {
      setUser(result.user)
      // Store in secure HTTP-only way (for now using localStorage, can be upgraded)
      localStorage.setItem('authToken', token)
      localStorage.setItem('classificationLevel', result.user.classificationLevel.toString())
      setIsLoading(false)
      return { success: true }
    } else {
      setIsLoading(false)
      return { success: false, error: result.error || 'Login failed' }
    }
  }

  const guestLogin = () => {
    const guestUser: User = {
      token: 'guest',
      classificationLevel: 1,
      name: 'Guest'
    }
    setUser(guestUser)
    localStorage.setItem('authToken', 'guest')
    localStorage.setItem('classificationLevel', '1')
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('classificationLevel')
  }

  const loadUserDetails = useCallback(async () => {
    if (!user || user.token === 'guest') {
      return
    }

    try {
      // Fetch detailed user information
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      
      // If user has a creator, fetch the creator's name
      let createdByName = undefined
      if (data.created_by) {
        try {
          const creatorResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens/${data.created_by}/name`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          })
          
          if (creatorResponse.ok) {
            const creatorData = await creatorResponse.json()
            createdByName = creatorData.name
          }
        } catch (error) {
          // If creator name fetch fails, just use "GOD" as fallback
          createdByName = 'GOD'
        }
      } else {
        createdByName = 'GOD'
      }

      // Update user with detailed information
      setUser({
        ...user,
        name: data.name,
        expiresAt: data.expires_at,
        createdBy: data.created_by,
        createdByName: createdByName,
        description: data.description,
        lastUsedAt: data.last_used_at,
        tokenId: data.token_id
      })
      
    } catch (error) {
      console.error('Failed to load user details:', error)
    }
  }, [user])

  const loadTokenStats = useCallback(async () => {
    if (!user || user.token === 'guest') {
      return null
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return {
        created: data.created,
        maxAllowed: data.max_allowed,
        canCreate: data.can_create
      }
    } catch (error) {
      console.error('Failed to load token stats:', error)
      return null
    }
  }, [user])

  const validateStoredToken = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('authToken')
    
    if (!storedToken) {
      setIsLoading(false)
      return false
    }

    // Handle guest token
    if (storedToken === 'guest') {
      const guestUser: User = {
        token: 'guest',
        classificationLevel: 1,
        name: 'Guest'
      }
      setUser(guestUser)
      setIsLoading(false)
      return true
    }

    const result = await validateToken(storedToken)
    
    if (result.valid && result.user) {
      setUser(result.user)
      setIsLoading(false)
      return true
    } else {
      // Clear invalid stored token
      logout()
      setIsLoading(false)
      return false
    }
  }

  // Check for existing token on mount
  useEffect(() => {
    validateStoredToken()
  }, [])

  const value: AuthContextType = {
    user,
    classificationLevel,
    isAuthenticated: !!user,
    isLoading,
    login,
    guestLogin,
    logout,
    validateToken: () => validateStoredToken(),
    loadUserDetails,
    loadTokenStats
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}