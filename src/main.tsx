import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Enhanced global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Prevent the default browser behavior which might terminate the app
  event.preventDefault();
});

// Add global error handler for fetch and network errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent default browser error handling
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
