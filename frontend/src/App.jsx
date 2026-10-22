import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import GameScreen from './components/Game/GameScreen';
import StatsScreen from './components/Stats/StatsScreen';

function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="loading-screen">
      <p>Loading…</p>
      {slow && <p className="loading-hint">Waking up the server. The first visit can take up to a minute.</p>}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/auth" replace />;
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute><AuthScreen /></AuthRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><GameScreen /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsScreen /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
