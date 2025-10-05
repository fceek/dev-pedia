'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { ClusterInfo, GetClustersResponse } from '@/types/cluster'
import styles from './ClusterPanel.module.css'

interface ClusterPanelProps {
  algorithm?: string
  onClusterClick?: (cluster: ClusterInfo) => void
}

export default function ClusterPanel({ algorithm = 'label_propagation', onClusterClick }: ClusterPanelProps) {
  const router = useRouter()
  const { user, classificationLevel } = useAuth()
  const { isDark, getConditionalClass } = useTheme()

  const [clusters, setClusters] = useState<ClusterInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // Fetch clusters
  const fetchClusters = async () => {
    if (!user?.token) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/graph/clusters?algorithm=${algorithm}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch clusters')
      }

      const data: GetClustersResponse = await response.json()
      setClusters(data.clusters || [])
    } catch (err) {
      console.error('Error fetching clusters:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
  }, [algorithm, user])

  // Run clustering algorithm
  const handleRunClustering = async () => {
    if (!user?.token) return

    setIsRunning(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/graph/clusters/run`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ algorithm })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to run clustering')
      }

      const data = await response.json()

      // Refresh clusters after successful run
      await fetchClusters()
    } catch (err) {
      console.error('Error running clustering:', err)
      setError(err instanceof Error ? err.message : 'Failed to run clustering')
    } finally {
      setIsRunning(false)
    }
  }

  const handleClusterClick = (cluster: ClusterInfo) => {
    if (onClusterClick) {
      onClusterClick(cluster)
    } else {
      // Navigate to representative article
      router.push(`/article/${cluster.representative_source_type}/${cluster.representative_id}`)
    }
  }

  if (isLoading) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
        <h3 className={styles.header}>Communities</h3>
        <div className={styles.loading}>Loading clusters...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
        <h3 className={styles.header}>Communities</h3>
        <div className={styles.error}>{error}</div>
        {classificationLevel >= 4 && (
          <button
            className={styles.runButton}
            onClick={handleRunClustering}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Clustering'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.headerRow}>
        <h3 className={styles.header}>
          Communities <span className={styles.count}>({clusters.length})</span>
        </h3>
        {classificationLevel >= 4 && (
          <button
            className={styles.runButton}
            onClick={handleRunClustering}
            disabled={isRunning}
            title="Re-run clustering algorithm"
          >
            {isRunning ? '⟳' : '▶'}
          </button>
        )}
      </div>

      {clusters.length === 0 ? (
        <div className={styles.empty}>
          No clusters detected.
          {classificationLevel >= 4 && ' Click Run to detect communities.'}
        </div>
      ) : (
        <div className={styles.clustersList}>
          {clusters.map((cluster) => (
            <div
              key={cluster.cluster_id}
              className={styles.clusterItem}
              onClick={() => handleClusterClick(cluster)}
            >
              <div className={styles.clusterHeader}>
                <span className={styles.clusterLabel}>{cluster.label}</span>
                <span className={styles.clusterSize}>{cluster.size} articles</span>
              </div>
              <div className={styles.clusterMetrics}>
                <span className={styles.metric}>
                  Density: {(cluster.density * 100).toFixed(1)}%
                </span>
                <span className={styles.metric}>
                  Avg. Centrality: {(cluster.avg_centrality * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.representative}>
                <span className={styles.representativeLabel}>Representative:</span>
                <span className={styles.representativeTitle}>{cluster.representative_title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
