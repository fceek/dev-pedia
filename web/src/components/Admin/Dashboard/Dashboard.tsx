'use client'

import MeCard from './Cards/MeCard/MeCard'
import TokenCard from './Cards/TokenCard/TokenCard'
import ArticleCard from './Cards/ArticleCard/ArticleCard'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.cardsGrid}>
        <MeCard />
        <TokenCard />
        <ArticleCard />
      </div>
    </div>
  )
}