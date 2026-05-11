import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Home from './pages/Home';
import History from './pages/History';
import Leave from './pages/Leave';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Approvals from './pages/Approvals';
import Announcements from './pages/Announcements';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          กำลังโหลด...
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <AppLayout><Home /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/history" element={
        <PrivateRoute>
          <AppLayout><History /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/leave" element={
        <PrivateRoute>
          <AppLayout><Leave /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/approvals" element={
        <PrivateRoute>
          <AppLayout><Approvals /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/announcements" element={
        <PrivateRoute>
          <AppLayout><Announcements /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <AppLayout><Profile /></AppLayout>
        </PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute>
          <Admin />
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
