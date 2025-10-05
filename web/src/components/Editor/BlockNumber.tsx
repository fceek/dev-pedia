'use client'

import { useTheme } from '@/contexts/ThemeContext'
import styles from './BlockNumber.module.css'

interface BlockNumberProps {
  blockNumber: number
  isSelected: boolean
  onSelect: (isSelected: boolean) => void
}

export default function BlockNumber({
  blockNumber,
  isSelected,
  onSelect
}: BlockNumberProps) {
  const { isDark, getConditionalClass } = useTheme()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(!isSelected)
  }

  return (
    <div
      className={`${styles.blockNumber} ${isSelected ? styles.selected : ''} ${getConditionalClass(styles, 'dark', isDark)}`}
      onClick={handleClick}
      title={isSelected ? 'Deselect block' : 'Select block'}
    >
      <div className={styles.numberDisplay}>{blockNumber}</div>
    </div>
  )
}
