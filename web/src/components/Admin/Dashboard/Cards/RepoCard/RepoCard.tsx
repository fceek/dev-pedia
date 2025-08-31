'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import styles from './RepoCard.module.css'

interface Repository {
  id: string
  name: string
  url: string
  branch: string
  fileStats: {
    documented: number
    undocumented: number
    outdated: number
    deprecated: number
  }
  totalFiles: number
}

export default function RepoCard() {
  const { user } = useAuth()
  const { isDark, getConditionalClass } = useTheme()
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Mock repository data
  const repositories: Repository[] = [
    {
      id: '1',
      name: 'dev-pedia-web',
      url: 'https://github.com/acme-corp/dev-pedia-web',
      branch: 'main',
      fileStats: {
        documented: 45,
        undocumented: 23,
        outdated: 12,
        deprecated: 8
      },
      totalFiles: 88
    },
    {
      id: '2',
      name: 'api-gateway',
      url: 'https://github.com/acme-corp/api-gateway',
      branch: 'develop',
      fileStats: {
        documented: 67,
        undocumented: 34,
        outdated: 15,
        deprecated: 4
      },
      totalFiles: 120
    },
    {
      id: '3',
      name: 'auth-service',
      url: 'https://github.com/acme-corp/auth-service',
      branch: 'main',
      fileStats: {
        documented: 32,
        undocumented: 18,
        outdated: 6,
        deprecated: 2
      },
      totalFiles: 58
    }
  ]
  
  if (!user) return null

  const totalPages = repositories.length + 1 // +1 for add new repo page
  const isAddPage = currentIndex === repositories.length
  const currentRepo = !isAddPage ? repositories[currentIndex] : null

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(totalPages - 1, prev + 1))
  }

  const getStatusPercentage = (count: number, total: number): number => {
    return Math.round((count / total) * 100)
  }

  const renderDiskFragmentBar = (repo: Repository) => {
    const { fileStats, totalFiles } = repo
    const documentedPercent = (fileStats.documented / totalFiles) * 100
    const undocumentedPercent = (fileStats.undocumented / totalFiles) * 100
    const outdatedPercent = (fileStats.outdated / totalFiles) * 100
    const deprecatedPercent = (fileStats.deprecated / totalFiles) * 100

    return (
      <div className={styles.diskFragmentContainer}>
        <div className={styles.diskFragmentBar}>
          <div 
            className={`${styles.fragmentSection} ${styles.documented}`}
            style={{ width: `${documentedPercent}%` }}
          >
            <div className={`${styles.fragmentLine} ${styles.line1}`}></div>
            <div className={`${styles.fragmentCaption} ${styles.caption1}`}>
              <span className={styles.captionCount}>{fileStats.documented}</span>
              <span className={styles.captionText}>DOCUMENTED</span>
            </div>
          </div>
          
          <div 
            className={`${styles.fragmentSection} ${styles.undocumented}`}
            style={{ width: `${undocumentedPercent}%` }}
          >
            <div className={`${styles.fragmentLine} ${styles.line2}`}></div>
            <div className={`${styles.fragmentCaption} ${styles.caption2}`}>
              <span className={styles.captionCount}>{fileStats.undocumented}</span>
              <span className={styles.captionText}>UNDOCUMENTED</span>
            </div>
          </div>
          
          <div 
            className={`${styles.fragmentSection} ${styles.outdated}`}
            style={{ width: `${outdatedPercent}%` }}
          >
            <div className={`${styles.fragmentLine} ${styles.line3}`}></div>
            <div className={`${styles.fragmentCaption} ${styles.caption3}`}>
              <span className={styles.captionCount}>{fileStats.outdated}</span>
              <span className={styles.captionText}>OUTDATED</span>
            </div>
          </div>
          
          <div 
            className={`${styles.fragmentSection} ${styles.deprecated}`}
            style={{ width: `${deprecatedPercent}%` }}
          >
            <div className={`${styles.fragmentLine} ${styles.line4}`}></div>
            <div className={`${styles.fragmentCaption} ${styles.caption4}`}>
              <span className={styles.captionCount}>{fileStats.deprecated}</span>
              <span className={styles.captionText}>DEPRECATED</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAddRepoPage = () => (
    <div className={styles.addRepoPage}>
      <div className={styles.addRepoIcon}>+</div>
      <div className={styles.addRepoText}>Add New Repository</div>
    </div>
  )

  return (
    <div className={`${styles.repoCard} ${getConditionalClass(styles, 'dark', isDark)}`}>
      <div className={styles.cardHeader}>
        <div className={styles.typeLabel}>REPOSITORIES</div>
        <div className={styles.pageIndicator}>
          {Array.from({ length: totalPages }, (_, index) => (
            <div
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.active : ''} ${index === totalPages - 1 ? styles.addPage : ''}`}
            />
          ))}
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ‹
        </button>
        
        <div className={styles.mainContent}>
          {isAddPage ? renderAddRepoPage() : (
            <>
              <div className={styles.repoInfo}>
                <div className={styles.repoName}>{currentRepo?.name}</div>
                <div className={styles.repoDetails}>
                  <div className={styles.repoUrl}>
                    <a href={currentRepo?.url} target="_blank" rel="noopener noreferrer">
                      {currentRepo?.url}
                    </a>
                  </div>
                  <div className={styles.repoBranch}>
                    <span className={styles.branchLabel}>BRANCH:</span>
                    <span className={styles.branchName}>{currentRepo?.branch}</span>
                  </div>
                </div>
              </div>
              
              {currentRepo && renderDiskFragmentBar(currentRepo)}
              
              {currentRepo && (
                <div className={styles.totalFiles}>
                  <span className={styles.filesCount}>{currentRepo.totalFiles}</span>
                  <span className={styles.filesLabel}>FILES</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={handleNext}
          disabled={currentIndex === totalPages - 1}
        >
          ›
        </button>
      </div>
    </div>
  )
}