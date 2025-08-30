'use client'

import styles from './NavList.module.css'

interface NavItem {
  title: string
  href?: string
}

interface NavListProps {
  items: NavItem[]
  activeIndex?: number
  onItemClick?: (index: number) => void
}

export default function NavList({ 
  items, 
  activeIndex = 0, 
  onItemClick 
}: NavListProps) {
  return (
    <ul className={styles.navList}>
      {items.map((item, index) => (
        <li 
          key={index}
          className={`${styles.navItem} ${index === activeIndex ? styles.active : ''}`}
          onClick={() => onItemClick?.(index)}
        >
          {item.title}
        </li>
      ))}
    </ul>
  )
}