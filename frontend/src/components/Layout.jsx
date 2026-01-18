import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Layout.css'

function Layout({ children, currentUser, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = (path) => location.pathname === path || (path === '/fyp' && location.pathname === '/')

  const isFYP = location.pathname === '/' || location.pathname === '/fyp'

  return (
    <div className="app-container">
      {/* Top Navigation Bar - Hidden on FYP for TikTok-style experience */}
      {!isFYP && (
        <nav className="top-nav">
          <Link to="/" className="logo">
            <span className="logo-gradient">Parallel</span>
          </Link>
          <div className="nav-links">
            <Link
              to="/fyp"
              className={`nav-link ${isActive('/') || isActive('/fyp') ? 'active' : ''}`}
            >
              FYP
            </Link>
            <Link
              to="/following"
              className={`nav-link ${isActive('/following') ? 'active' : ''}`}
            >
              Following
            </Link>
            <Link
              to="/search"
              className={`nav-link ${isActive('/search') ? 'active' : ''}`}
            >
              Search
            </Link>
            <Link
              to={`/profile/${currentUser.id}`}
              className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
            >
              Profile
            </Link>
            <Link
              to="/create"
              className={`nav-link ${isActive('/create') ? 'active' : ''}`}
            >
              Create
            </Link>
            <Link
              to="/about"
              className={`nav-link ${isActive('/about') ? 'active' : ''}`}
            >
              About
            </Link>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </nav>
      )}

      {/* Main Content */}
      <main className={`main-content ${isFYP ? 'fyp-main' : ''}`}>
        {children}
      </main>
    </div>
  )
}

export default Layout
