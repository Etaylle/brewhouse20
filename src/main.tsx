import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
/**
 * @type {import('react-dom/client').Root} 
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
