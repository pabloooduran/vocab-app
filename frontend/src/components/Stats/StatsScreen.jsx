import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import styles from './StatsScreen.module.css';

export default function StatsScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/stats', token)
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  function filteredWords() {
    if (!stats?.wordStats) return [];
    switch (filter) {
      case 'hard':
        return stats.wordStats.filter(w => w.incorrect_count > 0)
          .sort((a, b) => b.incorrect_count - a.incorrect_count);
      case 'mastered':
        return stats.wordStats.filter(w => w.correct_count >= 3 && w.incorrect_count === 0)
          .sort((a, b) => b.correct_count - a.correct_count);
      default:
        return stats.wordStats;
    }
  }

  const words = filteredWords();

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className={styles.title}>My Statistics</h1>
        <div />
      </div>

      {loading && (
        <div className={styles.center}>
          <div className={styles.spinner} />
        </div>
      )}

      {error && (
        <div className={styles.center}>
          <p className={styles.errorMsg}>{error}</p>
        </div>
      )}

      {!loading && !error && stats && (
        <div className={styles.content}>
          {/* Summary row */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.user.current_streak}</span>
              <span className={styles.summaryLabel}>Current Streak</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.user.max_streak}</span>
              <span className={styles.summaryLabel}>Best Streak</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.accuracy}%</span>
              <span className={styles.summaryLabel}>Accuracy</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{stats.studied}</span>
              <span className={styles.summaryLabel}>
                of {stats.totalWords} studied
              </span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className={styles.filters}>
            {[
              { id: 'all', label: 'All Studied' },
              { id: 'hard', label: 'Needs Work' },
              { id: 'mastered', label: 'Mastered' },
            ].map(f => (
              <button
                key={f.id}
                className={`${styles.filterBtn} ${filter === f.id ? styles.active : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Word list */}
          {words.length === 0 ? (
            <p className={styles.empty}>No words in this category yet.</p>
          ) : (
            <div className={styles.wordList}>
              {words.map(w => (
                <div key={w.word} className={styles.wordRow}>
                  <div className={styles.wordInfo}>
                    <span className={styles.wordText}>{w.word}</span>
                    {w.translation && (
                      <span className={styles.translation}>{w.translation}</span>
                    )}
                    <p className={styles.definition}>{w.definition}</p>
                  </div>
                  <div className={styles.wordCounts}>
                    <span className={styles.correct}>{w.correct_count}✓</span>
                    <span className={styles.incorrect}>{w.incorrect_count}✗</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
