// Example for index.js or main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Your Tailwind CSS import
import Dashboard from './components/Dashboard'; // Import the new Dashboard component

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);