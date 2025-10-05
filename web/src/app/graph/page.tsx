'use client'

import { useState } from 'react'
import Layout from '@/components/Layout/Layout'
import GraphView from '@/components/Graph/GraphView'
import styles from './page.module.css'

export default function GraphPage() {
  const [viewMode, setViewMode] = useState<'full' | 'stats'>('full')

  return (
    <Layout
      leftColumn={
        <div className={styles.graphContainer}>
          <div className={styles.header}>
            <h1>Knowledge Graph</h1>
            <div className={styles.controls}>
              <button
                className={`${styles.controlButton} ${viewMode === 'full' ? styles.active : ''}`}
                onClick={() => setViewMode('full')}
              >
                Graph View
              </button>
              <button
                className={`${styles.controlButton} ${viewMode === 'stats' ? styles.active : ''}`}
                onClick={() => setViewMode('stats')}
              >
                Statistics
              </button>
            </div>
          </div>

          {viewMode === 'full' && (
            <div className={styles.graphWrapper}>
              <GraphView />
            </div>
          )}

          {viewMode === 'stats' && (
            <div className={styles.statsView}>
              <p>Graph statistics view coming soon...</p>
            </div>
          )}
        </div>
      }
      rightColumn={
        <div className={styles.sidebar}>
          <h3>Graph Legend</h3>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIcon} ${styles.level1}`}></div>
              <span>Level 1</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIcon} ${styles.level2}`}></div>
              <span>Level 2</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIcon} ${styles.level3}`}></div>
              <span>Level 3</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIcon} ${styles.level4}`}></div>
              <span>Level 4</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIcon} ${styles.level5}`}></div>
              <span>Level 5</span>
            </div>
          </div>

          <h3>Node Types</h3>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span>⭐ Hub</span>
            </div>
            <div className={styles.legendItem}>
              <span>👑 Authority</span>
            </div>
            <div className={styles.legendItem}>
              <span>🔗 Orphan</span>
            </div>
          </div>

          <h3>Controls</h3>
          <ul className={styles.controlsList}>
            <li>Click: Select node</li>
            <li>Drag: Move node</li>
            <li>Scroll: Zoom in/out</li>
            <li>Hover: Highlight connections</li>
          </ul>
        </div>
      }
      breadcrumbs={['Graph', 'Home']}
      author="Fceek@London"
      year={2025}
      gridRatio="4fr 1fr"
    />
  )
}
