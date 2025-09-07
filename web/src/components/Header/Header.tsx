'use client'

import { usePathname } from 'next/navigation'
import Breadcrumb from './Breadcrumb/Breadcrumb'
import ClassificationIndicator from './ClassificationIndicator/ClassificationIndicator'
import { generateBreadcrumbsFromPath } from '@/utils/breadcrumbs'
import styles from './Header.module.css'

interface HeaderProps {
  breadcrumbs?: string[]
  classificationLevel?: number
  isExpanded?: boolean
  onBreadcrumbClick?: (item: string) => void
}

export default function Header({ 
  breadcrumbs, 
  classificationLevel = 2,
  isExpanded = false,
  onBreadcrumbClick
}: HeaderProps) {
  const pathname = usePathname()
  const generatedBreadcrumbs = generateBreadcrumbsFromPath(pathname, breadcrumbs)

  return (
    <header className={`${styles.header} ${isExpanded ? styles.expanded : ''}`}>
      <ClassificationIndicator level={classificationLevel} />
      <Breadcrumb items={generatedBreadcrumbs} onItemClick={onBreadcrumbClick} />
    </header>
  )
}