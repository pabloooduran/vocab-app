import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import StreakDisplay from './StreakDisplay';
import styles from './GameScreen.module.css';

const PHASE = {
  LOADING: 'loading',
  QUESTION: 'question',
  FEEDBACK: 'feedback',
  ERROR: 'error',
};

export default function GameScreen() {
  const { user, token, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState(PHASE.LOADING);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(user?.current_streak || 0);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(0);

  const loadQuestion = useCallback(async () => {
    setPhase(PHASE.LOADING);
    setSelected(null);
    setResult(null);
    try {
      const data = await api.get('/game/question', token);
      setQuestion(data);
      setPhase(PHASE.QUESTION);
    } catch (err) {
      setError(err.message);
      setPhase(PHASE.ERROR);
    }
  }, [token]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  async function handleSelect(word) {
    if (phase !== PHASE.QUESTION || selected) return;
    setSelected(word);
    setPhase(PHASE.FEEDBACK);

    try {
      const data = await api.post('/game/answer', { selectedWord: word }, token);
      setResult(data);
      setStreak(data.streak);
      updateUser({ current_streak: data.streak, max_streak: data.maxStreak });
      setQuestionCount(c => c + 1);
    } catch (err) {
      setError(err.message);
      setPhase(PHASE.ERROR);
    }
  }

  async function handleExit() {
    try {
      await api.put('/game/save', {}, token);
    } catch (_) {}
    navigate('/');
  }

  function getOptionClass(word) {
    if (phase !== PHASE.FEEDBACK || !result) return styles.option;
    if (word === result.correctWord) return `${styles.option} ${styles.correct}`;
    if (word === selected && !result.correct) return `${styles.option} ${styles.wrong}`;
    return `${styles.option} ${styles.dimmed}`;
  }

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.exitBtn} onClick={handleExit}>
          ← Exit
        </button>
        <div className={styles.topCenter}>
          {questionCount > 0 && (
            <span className={styles.questionCount}>{questionCount} answered</span>
          )}
        </div>
        <StreakDisplay streak={streak} />
      </div>

      {/* Main content */}
      <div className={styles.main}>
        {phase === PHASE.LOADING && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
          </div>
        )}

        {phase === PHASE.ERROR && (
          <div className={styles.errorState}>
            <p className={styles.errorMsg}>{error}</p>
            <button className={styles.retryBtn} onClick={loadQuestion}>Try Again</button>
          </div>
        )}

        {(phase === PHASE.QUESTION || phase === PHASE.FEEDBACK) && question && (
          <>
            <div className={styles.questionCard}>
              <p className={styles.questionLabel}>What word matches this definition?</p>
              <p className={styles.definition}>{question.definition}</p>
              {phase === PHASE.FEEDBACK && question.example && (
                <p className={styles.example}>"{question.example}"</p>
              )}
            </div>

            <div className={styles.options}>
              {question.options.map((opt) => (
                <button
                  key={opt.word}
                  className={getOptionClass(opt.word)}
                  onClick={() => handleSelect(opt.word)}
                  disabled={phase === PHASE.FEEDBACK}
                >
                  <span className={styles.optionWord}>{opt.word}</span>
                  {phase === PHASE.FEEDBACK && opt.translation && (
                    <span className={styles.optionTranslation}>{opt.translation}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Feedback panel */}
            {phase === PHASE.FEEDBACK && result && (
              <div className={`${styles.feedback} ${result.correct ? styles.feedbackCorrect : styles.feedbackWrong}`}
                style={{ animation: 'slide-up 0.25s ease-out' }}>
                <div className={styles.feedbackHeader}>
                  <span className={styles.feedbackIcon}>{result.correct ? '✓' : '✗'}</span>
                  <span className={styles.feedbackTitle}>
                    {result.correct ? 'Correct!' : `The answer was: ${result.correctWord}`}
                  </span>
                </div>
                {result.synonyms && (
                  <p className={styles.feedbackDetail}>
                    <strong>Synonyms:</strong> {result.synonyms}
                  </p>
                )}
                {result.translation && (
                  <p className={styles.feedbackDetail}>
                    <strong>Spanish:</strong> {result.translation}
                  </p>
                )}
                <button className={styles.nextBtn} onClick={loadQuestion} autoFocus>
                  Next question →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
