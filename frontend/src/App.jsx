import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from './api'
import './index.css'
import FYP from './pages/FYP'
import LoginSignup from './pages/LoginSignup'
import Following from './pages/Following'
import Search from './pages/Search'
import Profile from './pages/Profile'
import Create from './pages/Create'
import About from './pages/About'
import Settings from './pages/Settings'
import Leaderboard from './pages/Leaderboard'
import Layout from './components/Layout'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from localStorage and validate token on mount
    const initAuth = async () => {
      const savedUser = localStorage.getItem('currentUser')
      const authToken = localStorage.getItem('authToken')

      if (savedUser && authToken) {
        try {
          // Validate token by fetching current user
          const response = await api.getCurrentUser()
          setCurrentUser(response.data)
        } catch (e) {
          console.error('Failed to validate token:', e)
          // Clear invalid tokens
          localStorage.removeItem('currentUser')
          localStorage.removeItem('authToken')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const handleLogin = (user) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner-large"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginSignup onLogin={handleLogin} />} />
        <Route path="/signup" element={<LoginSignup onLogin={handleLogin} />} />
        <Route path="/about" element={<About />} />

        {/* Protected routes - require authentication */}
        <Route
          path="/*"
          element={
            currentUser ? (
              <Layout currentUser={currentUser} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<FYP currentUser={currentUser} onLogout={handleLogout} />} />
                  <Route path="/fyp" element={<FYP currentUser={currentUser} onLogout={handleLogout} />} />
                  <Route path="/following" element={<Following currentUser={currentUser} />} />
                  <Route path="/search" element={<Search currentUser={currentUser} />} />
                  <Route path="/profile/:userId?" element={<Profile currentUser={currentUser} />} />
                  <Route path="/create" element={<Create currentUser={currentUser} />} />
                  <Route path="/settings" element={<Settings currentUser={currentUser} onUpdateUser={setCurrentUser} />} />
                  <Route path="/leaderboard" element={<Leaderboard currentUser={currentUser} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
