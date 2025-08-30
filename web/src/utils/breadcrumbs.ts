interface BreadcrumbConfig {
  [key: string]: string | BreadcrumbConfig
}

const ROUTE_LABELS: { [key: string]: string } = {
  '/': 'Home',
  '/admin': 'Dashboard',
  '/demo': 'Demo'
}

export function generateBreadcrumbsFromPath(pathname: string, manualOverride?: string[]): string[] {
  if (manualOverride) {
    return manualOverride
  }

  // Get current page name
  const currentLabel = ROUTE_LABELS[pathname] || capitalizeSegment(pathname.split('/').pop() || '')
  const breadcrumbs: string[] = [currentLabel]

  // Add parent path segments (reverse order: current -> parent -> grandparent)
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 0) {
    return ['Home'] // Root page
  }

  // For /admin paths, add "Admin" as parent
  if (segments[0] === 'admin') {
    breadcrumbs.push('Admin')
  }
  
  // Don't add "Home" for now, since the original design shows: current < section < LOGO

  return breadcrumbs
}

function capitalizeSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}