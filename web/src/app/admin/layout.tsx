'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import LargeGlow from '@/components/LargeGlow/LargeGlow'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, classificationLevel, isLoading } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || classificationLevel < 3) {
        router.replace('/?unauthorized=admin')
        return
      }
    }
  }, [isAuthenticated, classificationLevel, isLoading, router])

  // Show loading or unauthorized state
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated || classificationLevel < 3) {
    return null // Will redirect via useEffect
  }

  return (
    <>
      <LargeGlow />
      {children}
    </>
  )
}