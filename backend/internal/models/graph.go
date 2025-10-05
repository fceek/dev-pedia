package models

import (
	"time"

	"github.com/google/uuid"
)

// ArticleLink represents a link between two articles (wiki-style [[...]] links)
type ArticleLink struct {
	ID                 uuid.UUID         `json:"id" db:"id"`
	SourceArticleID    uuid.UUID         `json:"source_article_id" db:"source_article_id"`
	SourceArticleType  ArticleSourceType `json:"source_article_type" db:"source_article_type"`
	TargetArticleID    uuid.UUID         `json:"target_article_id" db:"target_article_id"`
	TargetArticleType  ArticleSourceType `json:"target_article_type" db:"target_article_type"`
	LinkText           *string           `json:"link_text" db:"link_text"`
	LinkType           string            `json:"link_type" db:"link_type"` // 'wiki', 'mention', 'embed'
	ContextSnippet     *string           `json:"context_snippet" db:"context_snippet"`
	CreatedAt          time.Time         `json:"created_at" db:"created_at"`
}

// BacklinkView represents a materialized view entry with denormalized article data
type BacklinkView struct {
	LinkID               uuid.UUID         `json:"link_id" db:"link_id"`
	SourceArticleID      uuid.UUID         `json:"source_article_id" db:"source_article_id"`
	SourceArticleType    ArticleSourceType `json:"source_article_type" db:"source_article_type"`
	TargetArticleID      uuid.UUID         `json:"target_article_id" db:"target_article_id"`
	TargetArticleType    ArticleSourceType `json:"target_article_type" db:"target_article_type"`
	LinkText             *string           `json:"link_text" db:"link_text"`
	LinkType             string            `json:"link_type" db:"link_type"`
	ContextSnippet       *string           `json:"context_snippet" db:"context_snippet"`
	SourceTitle          string            `json:"source_title" db:"source_title"`
	SourcePath           string            `json:"source_path" db:"source_path"`
	SourceClassification int               `json:"source_classification" db:"source_classification"`
	SourceStatus         ArticleStatus     `json:"source_status" db:"source_status"`
	TargetTitle          string            `json:"target_title" db:"target_title"`
	TargetPath           string            `json:"target_path" db:"target_path"`
	TargetClassification int               `json:"target_classification" db:"target_classification"`
	TargetStatus         ArticleStatus     `json:"target_status" db:"target_status"`
	CreatedAt            time.Time         `json:"created_at" db:"created_at"`
}

// ArticleGraphStats represents graph metrics for an article
type ArticleGraphStats struct {
	ID                  uuid.UUID         `json:"id" db:"id"`
	ArticleID           uuid.UUID         `json:"article_id" db:"article_id"`
	ArticleSourceType   ArticleSourceType `json:"article_source_type" db:"article_source_type"`
	OutboundLinksCount  int               `json:"outbound_links_count" db:"outbound_links_count"`
	InboundLinksCount   int               `json:"inbound_links_count" db:"inbound_links_count"`
	TotalDegree         int               `json:"total_degree" db:"total_degree"`
	IsOrphan            bool              `json:"is_orphan" db:"is_orphan"`
	IsHub               bool              `json:"is_hub" db:"is_hub"`
	IsAuthority         bool              `json:"is_authority" db:"is_authority"`
	CalculatedAt        time.Time         `json:"calculated_at" db:"calculated_at"`
}

// GraphNode represents a node in the knowledge graph (an article)
type GraphNode struct {
	ID                  uuid.UUID         `json:"id"`
	SourceType          ArticleSourceType `json:"source_type"`
	Title               string            `json:"title"`
	FullPath            string            `json:"full_path"`
	ClassificationLevel int               `json:"classification_level"`
	Status              ArticleStatus     `json:"status"`

	// Graph metrics
	InboundCount        int               `json:"inbound_count"`
	OutboundCount       int               `json:"outbound_count"`
	TotalDegree         int               `json:"total_degree"`
	IsOrphan            bool              `json:"is_orphan"`
	IsHub               bool              `json:"is_hub"`
	IsAuthority         bool              `json:"is_authority"`

	// Optional metadata
	Tags                []ArticleTag      `json:"tags,omitempty"`
}

// GraphEdge represents an edge (link) in the knowledge graph
type GraphEdge struct {
	ID             uuid.UUID `json:"id"`
	Source         uuid.UUID `json:"source"`          // source article ID
	Target         uuid.UUID `json:"target"`          // target article ID
	Label          *string   `json:"label,omitempty"` // link text
	Type           string    `json:"type"`            // 'wiki', 'mention', 'embed'
	ContextSnippet *string   `json:"context_snippet,omitempty"`
}

// GraphData represents the complete graph data structure
type GraphData struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
	Stats GraphStats  `json:"stats"`
}

// GraphStats provides overall graph statistics
type GraphStats struct {
	TotalNodes        int     `json:"total_nodes"`
	TotalEdges        int     `json:"total_edges"`
	OrphansCount      int     `json:"orphans_count"`
	HubsCount         int     `json:"hubs_count"`
	AuthoritiesCount  int     `json:"authorities_count"`
	AverageDegree     float64 `json:"average_degree"`
	MaxDegree         int     `json:"max_degree"`

	// Classification breakdown
	NodesByClassification map[int]int `json:"nodes_by_classification"`
}

// BacklinkSummary represents a simplified backlink for article display
type BacklinkSummary struct {
	SourceArticleID      uuid.UUID         `json:"source_article_id"`
	SourceArticleType    ArticleSourceType `json:"source_article_type"`
	SourceTitle          string            `json:"source_title"`
	SourcePath           string            `json:"source_path"`
	SourceClassification int               `json:"source_classification"`
	LinkText             *string           `json:"link_text,omitempty"`
	ContextSnippet       *string           `json:"context_snippet,omitempty"`
	CreatedAt            time.Time         `json:"created_at"`
}

// ParsedLink represents a wiki-style link parsed from markdown content
type ParsedLink struct {
	OriginalText  string // The full [[...]] text
	TargetPath    string // The path or title to link to
	DisplayText   string // Custom display text (if using [[target|display]] syntax)
	StartPosition int    // Character position in content where link starts
	EndPosition   int    // Character position in content where link ends
}

// GetBacklinksResponse represents the API response for backlinks endpoint
type GetBacklinksResponse struct {
	Backlinks []BacklinkSummary `json:"backlinks"`
	Total     int               `json:"total"`
}

// GetGraphResponse represents the API response for graph endpoint
type GetGraphResponse struct {
	GraphData
	UserClassification int    `json:"user_classification"` // User's classification level for client-side filtering
	FilteredBy         string `json:"filtered_by,omitempty"` // Description of applied filters
}

// GetNeighborhoodRequest represents request params for neighborhood graph
type GetNeighborhoodRequest struct {
	ArticleID      uuid.UUID         `json:"article_id"`
	SourceType     ArticleSourceType `json:"source_type"`
	Depth          int               `json:"depth"`           // How many hops (default: 2)
	IncludeOrphans bool              `json:"include_orphans"` // Whether to include orphaned nodes
}

// BrokenLink represents a wiki link that points to a non-existent or archived article
type BrokenLink struct {
	LinkText      string `json:"link_text"`       // The full [[...]] text
	TargetPath    string `json:"target_path"`     // The path that couldn't be resolved
	StartPosition int    `json:"start_position"`  // Character position in content
	EndPosition   int    `json:"end_position"`    // Character position in content
	Reason        string `json:"reason"`          // Why the link is broken
}

// GetBrokenLinksResponse represents the API response for broken links endpoint
type GetBrokenLinksResponse struct {
	BrokenLinks []BrokenLink `json:"broken_links"`
	Total       int          `json:"total"`
}

// GraphFilterOptions represents filter options for graph queries
type GraphFilterOptions struct {
	MinClassificationLevel *int                 `json:"min_classification_level,omitempty"`
	MaxClassificationLevel *int                 `json:"max_classification_level,omitempty"`
	SourceTypes            []ArticleSourceType  `json:"source_types,omitempty"`
	OnlyHubs               bool                 `json:"only_hubs,omitempty"`
	OnlyAuthorities        bool                 `json:"only_authorities,omitempty"`
	OnlyOrphans            bool                 `json:"only_orphans,omitempty"`
	ExcludeOrphans         bool                 `json:"exclude_orphans,omitempty"`
}
