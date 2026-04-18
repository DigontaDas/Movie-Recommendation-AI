import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AIPage from './pages/AIPage.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"   element={<App />} />
      <Route path="/ai" element={<AIPage />} />
    </Routes>
  </BrowserRouter>
)