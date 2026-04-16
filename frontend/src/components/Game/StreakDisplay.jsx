import React from 'react';
import styles from './GameScreen.module.css';

export default function StreakDisplay({ streak }) {
  let levelClass = styles.streakBase;
  let label = '';

  if (streak >= 20) {
    levelClass = styles.streakRadiant;
    label = 'On fire!';
  } else if (streak >= 10) {
    levelClass = styles.streakShimmer;
    label = 'Blazing!';
  } else if (streak >= 5) {
    levelClass = styles.streakPulse;
    label = 'Hot streak!';
  } else if (streak >= 1) {
    label = 'Keep going!';
  }

  return (
    <div className={`${styles.streakDisplay} ${levelClass}`}>
      <span className={styles.streakCount}>{streak}</span>
      {label && <span className={styles.streakLabelText}>{label}</span>}
    </div>
  );
}
