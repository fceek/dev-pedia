'use client'

import RightColumnLayout from '../../shared/RightColumnLayout'
import ProjectInfo from './ProjectInfo/ProjectInfo'
import OrganizationInfo from './OrganizationInfo/OrganizationInfo'
import DashboardActions from './DashboardActions'

interface DashboardModeProps {
  data?: any
  transitionKey?: string
}

export default function DashboardMode({ data, transitionKey = 'dashboard' }: DashboardModeProps) {
  const treeSections = [
    {
      id: 'project',
      content: <ProjectInfo />
    },
    {
      id: 'organization', 
      content: <OrganizationInfo />
    }
  ]

  return (
    <RightColumnLayout
      treeSections={treeSections}
      bottomContent={<DashboardActions />}
      transitionKey={transitionKey}
    />
  )
}