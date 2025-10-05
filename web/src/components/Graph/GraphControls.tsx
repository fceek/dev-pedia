'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { GraphFilterOptions } from '@/types/graph'
import styles from './GraphControls.module.css'

interface GraphControlsProps {
  filters: GraphFilterOptions
  onFiltersChange: (filters: GraphFilterOptions) => void
}

export default function GraphControls({ filters, onFiltersChange }: GraphControlsProps) {
  const { classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleMinClassChange = (value: string) => {
    const val = value === '' ? undefined : parseInt(value)
    onFiltersChange({ ...filters, min_classification_level: val })
  }

  const handleMaxClassChange = (value: string) => {
    const val = value === '' ? undefined : parseInt(value)
    onFiltersChange({ ...filters, max_classification_level: val })
  }

  const handleSourceTypeToggle = (type: 'doc' | 'git') => {
    const currentTypes = filters.source_types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]

    onFiltersChange({
      ...filters,
      source_types: newTypes.length > 0 ? newTypes : undefined
    })
  }

  const handleNodeTypeChange = (type: 'hubs' | 'authorities' | 'orphans' | 'exclude_orphans') => {
    const updates: Partial<GraphFilterOptions> = {}

    if (type === 'hubs') {
      updates.only_hubs = !filters.only_hubs
      if (updates.only_hubs) {
        updates.only_authorities = false
        updates.only_orphans = false
      }
    } else if (type === 'authorities') {
      updates.only_authorities = !filters.only_authorities
      if (updates.only_authorities) {
        updates.only_hubs = false
        updates.only_orphans = false
      }
    } else if (type === 'orphans') {
      updates.only_orphans = !filters.only_orphans
      if (updates.only_orphans) {
        updates.only_hubs = false
        updates.only_authorities = false
        updates.exclude_orphans = false
      }
    } else if (type === 'exclude_orphans') {
      updates.exclude_orphans = !filters.exclude_orphans
      if (updates.exclude_orphans) {
        updates.only_orphans = false
      }
    }

    onFiltersChange({ ...filters, ...updates })
  }

  const handleReset = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.min_classification_level !== undefined ||
    filters.max_classification_level !== undefined ||
    (filters.source_types && filters.source_types.length > 0) ||
    filters.only_hubs ||
    filters.only_authorities ||
    filters.only_orphans ||
    filters.exclude_orphans

  return (
    <div className={`${styles.controls} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Filters {hasActiveFilters && <span className={styles.activeBadge}>Active</span>}</h3>
        <button className={styles.toggleButton}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.filtersPanel}>
          {/* Classification Level Filters */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Classification Level</label>
            <div className={styles.rangeInputs}>
              <select
                className={styles.select}
                value={filters.min_classification_level ?? ''}
                onChange={(e) => handleMinClassChange(e.target.value)}
              >
                <option value="">Min</option>
                {[1, 2, 3, 4, 5].filter(l => l <= classificationLevel).map(level => (
                  <option key={level} value={level}>L{level}</option>
                ))}
              </select>
              <span className={styles.rangeSeparator}>to</span>
              <select
                className={styles.select}
                value={filters.max_classification_level ?? ''}
                onChange={(e) => handleMaxClassChange(e.target.value)}
              >
                <option value="">Max</option>
                {[1, 2, 3, 4, 5].filter(l => l <= classificationLevel).map(level => (
                  <option key={level} value={level}>L{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Type Filters */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Source Type</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.source_types?.includes('doc') ?? false}
                  onChange={() => handleSourceTypeToggle('doc')}
                />
                <span>Documentation</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.source_types?.includes('git') ?? false}
                  onChange={() => handleSourceTypeToggle('git')}
                />
                <span>Git Repositories</span>
              </label>
            </div>
          </div>

          {/* Node Type Filters */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Node Type</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.only_hubs ?? false}
                  onChange={() => handleNodeTypeChange('hubs')}
                />
                <span>Only Hubs</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.only_authorities ?? false}
                  onChange={() => handleNodeTypeChange('authorities')}
                />
                <span>Only Authorities</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.only_orphans ?? false}
                  onChange={() => handleNodeTypeChange('orphans')}
                />
                <span>Only Orphans</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.exclude_orphans ?? false}
                  onChange={() => handleNodeTypeChange('exclude_orphans')}
                />
                <span>Exclude Orphans</span>
              </label>
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button className={styles.resetButton} onClick={handleReset}>
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
