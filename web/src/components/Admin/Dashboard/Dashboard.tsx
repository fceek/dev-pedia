'use client'

import MeCard from './Cards/MeCard/MeCard'
import TokenCard from './Cards/TokenCard/TokenCard'
import ArticleCard from './Cards/ArticleCard/ArticleCard'
import IntegrationCard from './Cards/IntegrationCard/IntegrationCard'
import RepoCard from './Cards/RepoCard/RepoCard'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.cardsGrid}>
        <MeCard />
        <TokenCard />
        <ArticleCard />
        <IntegrationCard />
        <RepoCard />
      </div>
    </div>
  )
}