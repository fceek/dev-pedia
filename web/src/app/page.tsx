'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout/Layout'
import LogoDisplay from '@/components/Left/LogoDisplay/LogoDisplay'
import IndexActions from '@/components/Right/IndexActions/IndexActions'
import LoginForm from '@/components/Right/LoginForm/LoginForm'

type ViewType = 'home' | 'login'

export default function Home() {
  const [view, setView] = useState<ViewType>('home')
  const { isAuthenticated, user, guestLogin } = useAuth()
  const router = useRouter()

  const handleLoginClick = () => {
    setView('login')
  }

  const handleGuestClick = () => {
    guestLogin()
    // Wait for light-up animation: 150ms delay + 300ms animation
    setTimeout(() => {
      router.push('/home')
    }, 500)
  }

  const handleLoginSuccess = () => {
    // Redirect to home page after successful login
    router.push('/home')
  }

  const handleBack = () => {
    setView('home')
  }

  const getRightColumn = () => {
    switch (view) {
      case 'home':
        return (
          <IndexActions 
            onLoginClick={handleLoginClick} 
            onGuestClick={handleGuestClick}
          />
        )
      case 'login':
        return <LoginForm onLoginSuccess={handleLoginSuccess} onBack={handleBack} />
      default:
        return null
    }
  }

  return (
    <Layout
      leftColumn={<LogoDisplay />}
      rightColumn={getRightColumn()}
      breadcrumbs={view === 'home' ? ['Home'] : ['Login', 'Home'] }
      author="Fceek@London"
      year={2025}
      gridRatio="2fr 1fr"
    />
  )
}
