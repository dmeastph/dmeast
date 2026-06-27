import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'

// ── Sentry error tracking ────────────────────────────────────────────────────
// Set VITE_SENTRY_DSN in Vercel dashboard (Project → Settings → Environment Variables)
// Leave unset in dev to disable.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,           // "production" | "development"
    release: import.meta.env.VITE_APP_VERSION,   // optional — set in CI
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,          // adjust to taste / GDPR requirements
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,  // 10% in prod, 100% in dev
    replaysSessionSampleRate: 0.05,   // 5% of sessions
    replaysOnErrorSampleRate: 1.0,    // 100% of sessions with errors
    // Don't send PII — strip query strings from URLs
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url);
          u.search = '';
          event.request.url = u.toString();
        } catch (_) { /* ignore */ }
      }
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
