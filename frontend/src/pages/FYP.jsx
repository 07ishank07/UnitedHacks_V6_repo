import { useState, useEffect } from 'react'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import './FYP.css'

function FYP({ currentUser }) {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      await api.createVote({
        user_id: currentUser.id,
        decision_id: decisionId,
        choice
      })
      // Reload decisions to get updated vote counts
      loadDecisions()
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

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button className="btn-primary" onClick={loadDecisions}>Retry</button>
      </div>
    )
  }

  return (
    <div className="fyp-page">
      <div className="page-header">
        <h1>For You</h1>
        <p className="page-subtitle">Discover decisions from the community</p>
      </div>

      <div className="decisions-container">
        <div className="decisions-feed">
          {decisions.length === 0 ? (
            <div className="decision-wrapper">
              <div className="decision-card-fullscreen empty-state">
                <p>No decisions yet. Be the first to post one!</p>
                <a href="/create" className="btn-primary">Create Decision</a>
              </div>
            </div>
          ) : (
            decisions.map(decision => (
              <div key={decision.id} className="decision-wrapper">
                <div className="decision-card-fullscreen">
                  <DecisionCard
                    decision={decision}
                    currentUserId={currentUser.id}
                    onVote={handleVote}
                    onDelete={handleDeleteDecision}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FYP
