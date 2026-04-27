import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './theme'
import { AppDataProvider } from './shared/context/AppDataContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
