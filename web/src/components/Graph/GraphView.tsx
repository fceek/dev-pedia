'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import dynamic from 'next/dynamic'
import type { GraphNode, GraphEdge, GraphData, ForceGraphNode, ForceGraphLink, GraphFilterOptions } from '@/types/graph'
import styles from './GraphView.module.css'

// Dynamically import ForceGraph to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface GraphViewProps {
  initialData?: GraphData
  articleId?: string
  sourceType?: 'doc' | 'git'
  depth?: number
  className?: string
  onNodeClick?: (node: GraphNode) => void
  filters?: GraphFilterOptions
}

export default function GraphView({
  initialData,
  articleId,
  sourceType,
  depth = 2,
  className = '',
  onNodeClick,
  filters
}: GraphViewProps) {
  const router = useRouter()
  const { classificationLevel, user } = useAuth()
  const { isDark } = useTheme()
  const graphRef = useRef<any>()

  const [graphData, setGraphData] = useState<GraphData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>())
  const [highlightLinks, setHighlightLinks] = useState(new Set<string>())

  // Classification colors matching globals.css
  const getClassificationColor = (level: number): string => {
    if (isDark) {
      const darkColors = {
        1: '#aa9977',
        2: '#b39955',
        3: '#cc9944',
        4: '#e6a943',
        5: '#ffb74c'
      }
      return darkColors[level as keyof typeof darkColors] || '#999999'
    } else {
      const lightColors = {
        1: '#777799',
        2: '#6688cc',
        3: '#6699ee',
        4: '#77aaff',
        5: '#8cb4ff'
      }
      return lightColors[level as keyof typeof lightColors] || '#888888'
    }
  }

  // Fetch graph data
  useEffect(() => {
    if (initialData) return

    const fetchGraphData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = user?.token
        if (!token) {
          throw new Error('Authentication required')
        }

        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/graph`
        const params = new URLSearchParams()

        if (articleId && sourceType) {
          url = `${process.env.NEXT_PUBLIC_API_URL}/api/graph/article/${sourceType}/${articleId}`
          params.append('depth', depth.toString())
        }

        // Add filter parameters
        if (filters) {
          if (filters.min_classification_level !== undefined) {
            params.append('min_classification', filters.min_classification_level.toString())
          }
          if (filters.max_classification_level !== undefined) {
            params.append('max_classification', filters.max_classification_level.toString())
          }
          if (filters.source_types && filters.source_types.length > 0) {
            params.append('source_types', filters.source_types.join(','))
          }
          if (filters.only_hubs) {
            params.append('only_hubs', 'true')
          }
          if (filters.only_authorities) {
            params.append('only_authorities', 'true')
          }
          if (filters.only_orphans) {
            params.append('only_orphans', 'true')
          }
          if (filters.exclude_orphans) {
            params.append('exclude_orphans', 'true')
          }
        }

        const queryString = params.toString()
        if (queryString) {
          url += `?${queryString}`
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch graph data')
        }

        const data = await response.json()
        setGraphData(data)
      } catch (err) {
        console.error('Failed to fetch graph:', err)
        setError(err instanceof Error ? err.message : 'Failed to load graph')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGraphData()
  }, [initialData, articleId, sourceType, depth, user, filters])

  // Handle node hover
  const handleNodeHover = useCallback((node: ForceGraphNode | null) => {
    const newHighlightNodes = new Set<string>()
    const newHighlightLinks = new Set<string>()

    if (node && graphData) {
      newHighlightNodes.add(node.id)

      // Highlight connected nodes and links
      graphData.edges.forEach(link => {
        if (link.source === node.id || link.target === node.id) {
          newHighlightLinks.add(link.id)
          newHighlightNodes.add(link.source)
          newHighlightNodes.add(link.target)
        }
      })
    }

    setHighlightNodes(newHighlightNodes)
    setHighlightLinks(newHighlightLinks)
  }, [graphData])

  // Handle node click
  const handleNodeClickInternal = useCallback((node: ForceGraphNode) => {
    setSelectedNode(node)

    if (onNodeClick) {
      onNodeClick(node)
    } else {
      // Default: navigate to article
      router.push(`/article/${node.source_type}/${node.id}`)
    }
  }, [onNodeClick, router])

  // Convert data to force graph format
  const forceGraphData = {
    nodes: graphData?.nodes || [],
    links: (graphData?.edges || []).map(edge => ({
      source: edge.source,
      target: edge.target,
      id: edge.id,
      label: edge.label,
      type: edge.type,
      context_snippet: edge.context_snippet
    }))
  }

  // Node rendering
  const nodeCanvasObject = useCallback((node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.title
    const fontSize = 12 / globalScale
    const nodeSize = Math.sqrt(node.total_degree + 1) * 3

    // Determine node color
    const isHighlighted = highlightNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const baseColor = getClassificationColor(node.classification_level)
    const nodeColor = isSelected ? '#ffffff' : (isHighlighted ? baseColor : baseColor + '99')

    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false)
    ctx.fillStyle = nodeColor
    ctx.fill()

    // Draw border for selected/highlighted nodes
    if (isSelected || isHighlighted) {
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
      ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale
      ctx.stroke()
    }

    // Draw label
    if (globalScale > 1.5 || isSelected) {
      ctx.font = `${fontSize}px 'Google Sans Code', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isDark ? '#ffffff' : '#000000'
      ctx.fillText(label, node.x!, node.y! + nodeSize + fontSize)
    }

    // Draw badge for special nodes
    if (node.is_hub || node.is_authority || node.is_orphan) {
      const badgeSize = nodeSize * 0.4
      ctx.font = `${badgeSize * 1.5}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (node.is_hub) {
        ctx.fillText('⭐', node.x! + nodeSize * 0.7, node.y! - nodeSize * 0.7)
      } else if (node.is_authority) {
        ctx.fillText('👑', node.x! + nodeSize * 0.7, node.y! - nodeSize * 0.7)
      } else if (node.is_orphan) {
        ctx.fillText('🔗', node.x! + nodeSize * 0.7, node.y! - nodeSize * 0.7)
      }
    }
  }, [highlightNodes, selectedNode, isDark, getClassificationColor])

  // Link rendering
  const linkCanvasObject = useCallback((link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightLinks.has(link.id || '')
    const source = typeof link.source === 'object' ? link.source : null
    const target = typeof link.target === 'object' ? link.target : null

    if (!source || !target) return

    ctx.strokeStyle = isHighlighted ? (isDark ? '#ffffff99' : '#00000099') : (isDark ? '#ffffff33' : '#00000033')
    ctx.lineWidth = isHighlighted ? 2 / globalScale : 1 / globalScale

    ctx.beginPath()
    ctx.moveTo(source.x!, source.y!)
    ctx.lineTo(target.x!, target.y!)
    ctx.stroke()

    // Draw arrow
    if (globalScale > 2) {
      const arrowLength = 8 / globalScale
      const arrowAngle = Math.PI / 6
      const angle = Math.atan2(target.y! - source.y!, target.x! - source.x!)
      const targetNodeSize = Math.sqrt(target.total_degree + 1) * 3

      const arrowX = target.x! - targetNodeSize * Math.cos(angle)
      const arrowY = target.y! - targetNodeSize * Math.sin(angle)

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - arrowAngle),
        arrowY - arrowLength * Math.sin(angle - arrowAngle)
      )
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + arrowAngle),
        arrowY - arrowLength * Math.sin(angle + arrowAngle)
      )
      ctx.stroke()
    }
  }, [highlightLinks, isDark])

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>Loading graph...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.error}>{error}</div>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.empty}>No articles to display in graph</div>
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <ForceGraph2D
        ref={graphRef}
        graphData={forceGraphData}
        nodeId="id"
        nodeLabel={(node: any) => `${node.title} (Level ${node.classification_level})`}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClickInternal}
        onNodeHover={handleNodeHover}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={(link: any) => highlightLinks.has(link.id) ? 2 : 0}
        backgroundColor={isDark ? '#1a1a1a' : '#ffffff'}
        warmupTicks={100}
        cooldownTime={3000}
      />

      {selectedNode && (
        <div className={`${styles.nodeInfo} ${isDark ? styles.dark : ''}`}>
          <h3>{selectedNode.title}</h3>
          <p>Path: {selectedNode.full_path}</p>
          <p>Classification: Level {selectedNode.classification_level}</p>
          <p>Links: {selectedNode.inbound_count} in / {selectedNode.outbound_count} out</p>
          {selectedNode.is_hub && <span className={styles.badge}>Hub</span>}
          {selectedNode.is_authority && <span className={styles.badge}>Authority</span>}
          {selectedNode.is_orphan && <span className={styles.badge}>Orphan</span>}
          <button onClick={() => setSelectedNode(null)}>Close</button>
        </div>
      )}
    </div>
  )
}
