import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerOfflineWorker } from './offline.ts'

void registerOfflineWorker().catch(() => {
  // The app remains usable online and exposes the offline error in its status panel.
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
