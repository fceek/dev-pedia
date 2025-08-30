'use client'

import Layout from '@/components/Layout/Layout'
import Dashboard from '@/components/Admin/Dashboard/Dashboard'
import AdminRightPanel from '@/components/Admin/Dashboard/RightColumn/AdminRightPanel'

export default function AdminPage() {
  return (
    <Layout
      leftColumn={<Dashboard />}
      rightColumn={<AdminRightPanel />}
      author="Fceek@London"
      year={2025}
      gridRatio="3fr 1fr"
    />
  )
}