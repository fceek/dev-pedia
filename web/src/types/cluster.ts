// Cluster data types matching backend models

export interface ClusterInfo {
  cluster_id: number
  algorithm: string
  label: string
  size: number
  density: number
  avg_centrality: number
  representative_id: string
  representative_source_type: 'doc' | 'git'
  representative_title: string
  representative_path: string
  representative_classification: number
}

export interface ArticleClusterAssignment {
  cluster_id: number
  cluster_label: string
  centrality_score: number
  algorithm: string
  calculated_at: string
}

export interface GetClustersResponse {
  clusters: ClusterInfo[]
  total: number
  algorithm: string
}

export interface RunClusteringRequest {
  algorithm: string
}

export interface RunClusteringResponse {
  success: boolean
  message: string
  cluster_count: number
  algorithm: string
}
