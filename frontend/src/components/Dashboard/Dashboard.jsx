import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';

function StreakBadge({ streak }) {
  let level = 'base';
  if (streak >= 20) level = 'radiant';
  else if (streak >= 10) level = 'shimmer';
  else if (streak >= 5) level = 'pulse';

  return (
    <div className={`${styles.streakBadge} ${styles[level]}`}>
      <span className={styles.streakNumber}>{streak}</span>
      <span className={styles.streakLabel}>streak</span>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const accuracy = user && (user.total_correct + user.total_incorrect) > 0
    ? Math.round((user.total_correct / (user.total_correct + user.total_incorrect)) * 100)
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>GRE Vocab</h1>
        </div>
        <div className={styles.userArea}>
          <span className={styles.username}>{user?.username}</span>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcome}>
          <h2 className={styles.welcomeText}>Welcome back, {user?.username}</h2>
          <p className={styles.welcomeSub}>Ready to expand your vocabulary?</p>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <StreakBadge streak={user?.current_streak || 0} />
            <p className={styles.statLabel}>Current Streak</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{user?.max_streak || 0}</span>
            <p className={styles.statLabel}>Best Streak</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {accuracy !== null ? `${accuracy}%` : '—'}
            </span>
            <p className={styles.statLabel}>Accuracy</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {(user?.total_correct || 0) + (user?.total_incorrect || 0)}
            </span>
            <p className={styles.statLabel}>Questions</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.playBtn} onClick={() => navigate('/game')}>
            <span className={styles.playIcon}>▶</span>
            Start Practicing
          </button>
          <button className={styles.statsBtn} onClick={() => navigate('/stats')}>
            View Stats
          </button>
        </div>
      </main>
    </div>
  );
}
