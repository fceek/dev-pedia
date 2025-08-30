'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import styles from './BuildGlow.module.css'

export default function BuildGlow() {
  const { isAuthenticated, classificationLevel } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Only show for authenticated users with level 3+ and NOT on admin pages
  if (!isAuthenticated || classificationLevel < 3 || pathname?.startsWith('/admin')) {
    return null
  }

  const handleAdminAccess = () => {
    // If already on admin route, do nothing
    if (pathname?.startsWith('/admin')) {
      return
    }
    
    // Navigate directly to admin area
    router.push('/admin')
  }
  
  return (
    <div 
      className={styles.buildGlow}
      onClick={handleAdminAccess}
      title="Admin Access"
    />
  )
}