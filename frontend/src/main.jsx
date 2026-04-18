import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Dashboard from './pages/Dashboard.jsx'
import GenrePage from './pages/GenrePage.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"               element={<App />} />
      <Route path="/dashboard"      element={<Dashboard />} />
      <Route path="/genre/:genreId" element={<GenrePage />} />
    </Routes>
  </BrowserRouter>
)