import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './theme.css';
import { TopBar } from './components/TopBar';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { Library } from './pages/Library';
import { Auth } from './pages/Auth';
import { AppProvider, useAppContext } from './context/AppContext';

/**
 * Guarded route that only renders children when authenticated.
 * Uses path-based Navigate with replace to prevent history pollution.
 */
// PUBLIC_INTERFACE
function ProtectedRoute({ children }) {
  /** Wraps children to require authentication, redirects to /auth if unauthenticated. */
  const { sessionChecked, user } = useAppContext();
  if (!sessionChecked) return null; // wait for session load
  return user ? children : <Navigate to="/auth" replace />;
}

// PUBLIC_INTERFACE
function AppShell() {
  /** Main application shell with top bar and routed content. */
  return (
    <div className="kc-app">
      <TopBar />
      <main className="kc-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/title/:id" element={<Detail />} />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Root application component. Provides App context and router. */
  return (
    <AppProvider>
      <Router>
        <AppShell />
      </Router>
    </AppProvider>
  );
}

export default App;
