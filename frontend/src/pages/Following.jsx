import { useState, useEffect } from 'react'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import './Following.css'

function Following({ currentUser }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadFollowingDecisions()
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

  const handleVote = async (decisionId, choice) => {
    try {
      await api.createVote({
        user_id: currentUser.id,
        decision_id: decisionId,
        choice
      })
      loadFollowingDecisions()
    } catch (err) {
      console.error('Failed to vote:', err)
      alert('Failed to vote or you already voted on this decision')
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
  )
}

export default Following
