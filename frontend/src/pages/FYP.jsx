import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import './FYP.css'

function FYP({ currentUser, onLogout }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadDecisions()
  }, [])

  const loadDecisions = async () => {
    try {
      setLoading(true)
      const response = await api.getDecisions()
      setDecisions(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load decisions:', err)
      setError('Failed to load decisions')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (decisionId, choice) => {
    try {
      if (choice === null) {
        // Remove vote
        await api.deleteVote(decisionId)
      } else {
        // Create or update vote
        await api.createVote({
          user_id: currentUser.id,
          decision_id: decisionId,
          choice
        })
      }
      // Reload decisions to get updated vote counts and user votes
      loadDecisions()
    } catch (err) {
      console.error('Failed to vote:', err)
      alert('Failed to update vote')
    }
  }

  const handleDeleteDecision = (decisionId) => {
    setDecisions(decisions.filter(d => d.id !== decisionId))
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner-large"></div>
        <p>Loading decisions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button className="btn-primary" onClick={loadDecisions}>Retry</button>
      </div>
    )
  }

  return (
    <div className="fyp-page tiktok-style">
      {/* Mobile navigation button */}
      <button
        className="mobile-nav-button"
        onClick={() => setShowMobileMenu(true)}
        aria-label="Open navigation menu"
      >
        ☰
      </button>

      {/* Mobile navigation overlay */}
      {showMobileMenu && (
        <div className="mobile-nav-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
            <div className="nav-links">
              <Link
                to="/fyp"
                className="nav-link active"
                onClick={() => setShowMobileMenu(false)}
              >
                FYP
              </Link>
              <Link
                to="/following"
                className="nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Following
              </Link>
              <Link
                to="/search"
                className="nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Search
              </Link>
              <Link
                to={`/profile/${currentUser.id}`}
                className="nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Profile
              </Link>
              <Link
                to="/create"
                className="nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Create
              </Link>
              <Link
                to="/about"
                className="nav-link"
                onClick={() => setShowMobileMenu(false)}
              >
                About
              </Link>
            </div>
            <button
              className="logout-btn"
              onClick={() => {
                setShowMobileMenu(false)
                onLogout()
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <div className="tiktok-container">
        {decisions.length === 0 ? (
          <div className="tiktok-slide empty-state">
            <p>No decisions yet. Be the first to post one!</p>
            <a href="/create" className="btn-primary">Create Decision</a>
          </div>
        ) : (
          decisions.map(decision => (
            <div key={decision.id} className="tiktok-slide">
              <DecisionCard
                decision={decision}
                currentUserId={currentUser.id}
                onVote={handleVote}
                onDelete={handleDeleteDecision}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FYP
