import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import App from './App.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TourismOperatorDashboard from './pages/TourismOperatorDashboard.jsx';
import GovernmentDashboard from './pages/GovernmentDashboard.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AppFooter from './components/AppFooter.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <div className="app-frame">
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />

            <Route
              path="/operator"
              element={
                <ProtectedRoute>
                  <TourismOperatorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/government"
              element={
                <ProtectedRoute>
                  <GovernmentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
          </Routes>

          <AppFooter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);