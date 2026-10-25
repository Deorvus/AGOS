import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Capacitor } from '@capacitor/core'

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {
      console.info('Offline installation unavailable; Agos remains usable online.')
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
