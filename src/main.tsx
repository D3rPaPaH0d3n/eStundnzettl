import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initSentry } from './utils/logger'
import './i18n' // Initialisiert i18next (DE default)
import './index.css'

// Initialize Sentry in production (no-op without DSN)
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element "#root" not found in index.html');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
