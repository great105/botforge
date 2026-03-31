import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import '../index.css';
import { useAuthStore } from '@/stores/authStore';

// Lazy-loaded routes for code splitting
const Dashboard = React.lazy(() => import('@/components/dashboard/BotList'));
const EditorPage = React.lazy(() => import('@/components/editor/Canvas'));
const AuthPage = React.lazy(() => import('@/components/shared/AuthPage'));
const ApiKeysPage = React.lazy(() => import('@/components/dashboard/ApiKeysPage'));
const PricingPage = React.lazy(() => import('@/components/dashboard/PricingPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-gray-400 text-sm animate-pulse">Загрузка...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:botId"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute>
                <ApiKeysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <PricingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PricingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
