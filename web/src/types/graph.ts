// Graph data types matching backend models

export interface GraphNode {
  id: string
  source_type: 'doc' | 'git'
  title: string
  full_path: string
  classification_level: number
  status: 'draft' | 'published' | 'archived'
  inbound_count: number
  outbound_count: number
  total_degree: number
  is_orphan: boolean
  is_hub: boolean
  is_authority: boolean
  tags?: ArticleTag[]
}

export interface GraphEdge {
  id: string
  source: string // source node ID
  target: string // target node ID
  label?: string
  type: 'wiki' | 'mention' | 'embed'
  context_snippet?: string
}

export interface GraphStats {
  total_nodes: number
  total_edges: number
  orphans_count: number
  hubs_count: number
  authorities_count: number
  average_degree: number
  max_degree: number
  nodes_by_classification: Record<number, number>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: GraphStats
}

export interface GetGraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: GraphStats
  user_classification: number
  filtered_by?: string
}

export interface BacklinkSummary {
  source_article_id: string
  source_article_type: 'doc' | 'git'
  source_title: string
  source_path: string
  source_classification: number
  link_text?: string
  context_snippet?: string
  created_at: string
}

export interface GetBacklinksResponse {
  backlinks: BacklinkSummary[]
  total: number
}

export interface ArticleTag {
  id: string
  name: string
  color: string
}

// Force graph node type (extends GraphNode with rendering properties)
export interface ForceGraphNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

// Force graph link type (extends GraphEdge)
export interface ForceGraphLink {
  source: string | ForceGraphNode
  target: string | ForceGraphNode
  id?: string
  label?: string
  type?: string
  context_snippet?: string
}

// Broken link types
export interface BrokenLink {
  link_text: string
  target_path: string
  start_position: number
  end_position: number
  reason: string
}

export interface GetBrokenLinksResponse {
  broken_links: BrokenLink[]
  total: number
}

// Graph filter options
export interface GraphFilterOptions {
  min_classification_level?: number
  max_classification_level?: number
  source_types?: ('doc' | 'git')[]
  only_hubs?: boolean
  only_authorities?: boolean
  only_orphans?: boolean
  exclude_orphans?: boolean
}
