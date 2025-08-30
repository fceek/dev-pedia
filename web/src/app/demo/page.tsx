'use client'

import { useState } from 'react'
import Layout from '@/components/Layout/Layout'
import Navigation from '@/components/Right/Navigation/Navigation'
import Content from '@/components/Left/Content/Content'
import styles from './page.module.css'

export default function DemoPage() {
  const [activeNavIndex, setActiveNavIndex] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const navItems = [
    { title: 'Getting Started' },
    { title: 'Team Structure' },
    { title: 'Development' },
    { title: 'Tools & Resources' },
    { title: 'Best Practices' }
  ]
  
  const tocItems = [
    { title: 'Overview', level: 0 },
    { title: 'Prerequisites', level: 0 },
    { title: 'System Requirements', level: 1 },
    { title: 'Dependencies', level: 1 },
    { title: 'Installation', level: 0 },
    { title: 'Quick Start', level: 1 },
    { title: 'Configuration', level: 1 },
    { title: 'Advanced Setup', level: 0 },
    { title: 'Docker Deployment', level: 1 },
    { title: 'Environment Variables', level: 1 },
    { title: 'Troubleshooting', level: 0 }
  ]

  const navigation = (
    <Navigation 
      navItems={navItems}
      tocItems={tocItems}
      activeNavIndex={activeNavIndex}
      onNavItemClick={setActiveNavIndex}
      isExpanded={isExpanded}
      includeImmersiveToggle={setIsExpanded}
    />
  )

  return (
    <Layout 
      leftColumn={
        <Content>
          <h1>Component Demo - DEV-Pedia Design System</h1>
            <p>This page demonstrates all the reusable components working together in harmony. The same design system from our playground, now modularized and production-ready.</p>
            
            <h2>Design System Architecture</h2>
            <p>Our component architecture follows a clean separation of concerns with reusable, type-safe components:</p>
            <ul>
              <li><strong>Layout</strong> - 4-section grid with theme management</li>
              <li><strong>Header</strong> - Logo, breadcrumbs, classification indicators</li>
              <li><strong>Footer</strong> - Author info and lights toggle</li>
              <li><strong>Navigation</strong> - Combines NavList + TOC components</li>
              <li><strong>Breadcrumb</strong> - Reusable navigation breadcrumbs with logo</li>
            </ul>
            
            <h2>Features Demonstrated</h2>
            <p>This page showcases all the interactive features we built:</p>
            <ol>
              <li><strong>Theme Switching</strong> - Try the "Lights" toggle in the footer with realistic fluorescent light flash effect</li>
              <li><strong>Immersive Mode</strong> - Use the "Immersive" toggle in the navigation to enter distraction-free reading mode</li>
              <li><strong>Custom Scrollbar</strong> - Notice the glowing scrollbar with radial gradient effect on the right edge</li>
              <li><strong>Classification System</strong> - See the filled circle indicators in the header showing security level</li>
              <li><strong>Responsive Design</strong> - All components use rem units and CSS variables for consistency</li>
            </ol>
            
            <h2>Component Benefits</h2>
            <p>Breaking down the design into reusable components provides:</p>
            <ul>
              <li>✅ <strong>Reusability</strong> - Same components across different pages</li>
              <li>✅ <strong>Consistency</strong> - Unified design language and behavior</li>
              <li>✅ <strong>Type Safety</strong> - TypeScript interfaces for all props</li>
              <li>✅ <strong>Modularity</strong> - Easy to customize per page requirements</li>
              <li>✅ <strong>Maintainability</strong> - Clean separation of concerns</li>
            </ul>
            
            <h2>Usage Examples</h2>
            <p>Each page can now easily implement the design system:</p>
            
            <h3>Basic Page</h3>
            <pre><code>{`<Layout leftColumn={<div>Simple content</div>} classificationLevel={1} />`}</code></pre>
            
            <h3>Page with Content and Navigation</h3>
            <pre><code>{`<Layout 
  leftColumn={<Content><div>Article content</div></Content>}
  rightColumn={<Navigation navItems={items} />}
/>`}</code></pre>
            
            <h2>Technical Implementation</h2>
            <p>The system leverages modern React patterns:</p>
            <ul>
              <li>CSS Modules for scoped styling</li>
              <li>CSS Variables for theming</li>
              <li>TypeScript for type safety</li>
              <li>Component composition patterns</li>
              <li>Props-based customization</li>
            </ul>
            
            <h2>Next Steps</h2>
            <p>With this foundation in place, we can now:</p>
            <ol>
              <li>Build specific pages for different use cases</li>
              <li>Implement the token management interface</li>
              <li>Add routing and navigation logic</li>
              <li>Expand the component library as needed</li>
              <li>Apply the design system consistently across the application</li>
            </ol>
            
            <p>The design playground served its purpose perfectly - allowing us to iterate and refine the visual design. Now we have a production-ready component system that maintains all the visual fidelity and interactive features while being properly architected for scalability and reusability.</p>
        </Content>
      }
      rightColumn={navigation}
      classificationLevel={2}
      author="Fceek@London"
      year={2025}
      isExpanded={isExpanded}
      onExpandToggle={setIsExpanded}
    />
  )
}