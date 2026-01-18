import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import './Following.css'

function Following({ currentUser }) {
  const [decisions, setDecisions] = useState([])
  const [recommendedUsers, setRecommendedUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followedUserIds, setFollowedUserIds] = useState(new Set())

  useEffect(() => {
    loadFollowingDecisions()
    loadRecommendedUsers()
  }, [])

  const loadFollowingDecisions = async () => {
    try {
      setLoading(true)
      const response = await api.getDecisions({ following_user_id: currentUser.id })
      setDecisions(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load following decisions:', err)
      setError('Failed to load decisions from people you follow')
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendedUsers = async () => {
    try {
      // For now, load all users as recommendations
      const response = await api.getAllUsers()
      // Filter out current user and get unique users
      const filtered = response.data.filter(u => u.id !== currentUser.id)
      setRecommendedUsers(filtered)
    } catch (err) {
      console.error('Failed to load recommended users:', err)
    }
  }

  const handleVote = async (decisionId, choice) => {
    try {
      if (choice === null) {
        await api.deleteVote(decisionId)
      } else {
        await api.createVote({
          user_id: currentUser.id,
          decision_id: decisionId,
          choice
        })
      }
      loadFollowingDecisions()
    } catch (err) {
      console.error('Failed to vote:', err)
      alert('Failed to update vote')
    }
  }

  const handleFollowUser = async (userId) => {
    try {
      await api.followUser(userId)
      setFollowedUserIds(new Set([...followedUserIds, userId]))
      // Reload decisions to show new user's decisions
      loadFollowingDecisions()
    } catch (err) {
      console.error('Failed to follow user:', err)
      alert('Failed to follow user')
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

  return (
    <div className="following-page">
      <div className="page-header">
        <h1>Following</h1>
        <p className="page-subtitle">Decisions from people you follow</p>
      </div>

      <div className="following-container">
        {/* Recommended Users Section */}
        {recommendedUsers.length > 0 && (
          <div className="recommended-section">
            <h2>Recommended to Follow</h2>
            <div className="recommended-users">
              {recommendedUsers.map(user => (
                <div key={user.id} className="recommended-user-card">
                  <div className="user-avatar-large">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <h3>{user.username}</h3>
                  <p className="user-stats">{user.followers_count || 0} followers</p>
                  <button 
                    className="btn-follow"
                    onClick={() => handleFollowUser(user.id)}
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decisions Feed */}
        <div className="decisions-section">
          <h2>Latest Decisions</h2>
          <div className="decisions-feed">
            {decisions.length === 0 ? (
              <div className="empty-state">
                <p>No decisions yet from people you follow.</p>
                <p className="text-muted">Follow some users to see their decisions here!</p>
              </div>
            ) : (
              decisions.map(decision => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  currentUserId={currentUser.id}
                  onVote={handleVote}
                  onDelete={handleDeleteDecision}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Following
