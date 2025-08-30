'use client'

import styles from './TOC.module.css'

interface TOCItem {
  title: string
  level: number
  href?: string
}

interface TOCProps {
  items: TOCItem[]
  onItemClick?: (index: number) => void
}

export default function TOC({ items, onItemClick }: TOCProps) {
  return (
    <ul className={styles.tocList}>
      {items.map((item, index) => (
        <li 
          key={index}
          className={`${styles.tocItem} ${styles[`level${item.level}`]}`}
          onClick={() => onItemClick?.(index)}
        >
          {item.title}
        </li>
      ))}
    </ul>
  )
}