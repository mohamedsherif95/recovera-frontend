import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { startAnalytics } from './lib/analytics';
import { router } from './routes';
import './index.css';
import './i18n/config.js';

startAnalytics(router);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
