import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Safe console overrides to prevent "Converting circular structure to JSON"
const safeArgsMap = (args) => args.map(arg => {
  if (arg instanceof Error) return arg.message;
  if (arg && typeof arg === 'object') {
    try {
      JSON.stringify(arg);
      return arg;
    } catch {
      return String(arg);
    }
  }
  return arg;
});

const originalConsoleError = console.error;
console.error = (...args) => originalConsoleError.apply(console, safeArgsMap(args));

const originalConsoleLog = console.log;
console.log = (...args) => originalConsoleLog.apply(console, safeArgsMap(args));

const originalConsoleWarn = console.warn;
console.warn = (...args) => originalConsoleWarn.apply(console, safeArgsMap(args));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
