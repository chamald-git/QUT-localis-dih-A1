import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import TourismOperatorDashboard from './pages/TourismOperatorDashboard.jsx';
import GovernmentDashboard from './pages/GovernmentDashboard.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/operator" element={<TourismOperatorDashboard />} />
        <Route path="/government" element={<GovernmentDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
