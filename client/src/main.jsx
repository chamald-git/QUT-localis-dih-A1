import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import TourismOperatorDashboard from './pages/TourismOperatorDashboard.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/operator" element={<TourismOperatorDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
