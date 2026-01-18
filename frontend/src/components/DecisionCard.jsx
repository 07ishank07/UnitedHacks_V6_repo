import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../api'
import './DecisionCard.css'

function DecisionCard({ decision, currentUserId, onVote, onDelete }) {
  const voteCounts = decision.vote_counts || { option_a: 0, option_b: 0 }
  const user = decision.user || {}
  const userVote = decision.user_vote
  const totalVotes = voteCounts.option_a + voteCounts.option_b
  const optionAPercentage = totalVotes > 0 ? Math.round((voteCounts.option_a / totalVotes) * 100) : 0
  const optionBPercentage = totalVotes > 0 ? Math.round((voteCounts.option_b / totalVotes) * 100) : 0

  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const loadComments = async () => {
    if (comments.length > 0) return // Already loaded

    setLoadingComments(true)
    try {
      const response = await api.getComments(decision.id)
      setComments(response.data)
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleShowComments = () => {
    setShowComments(!showComments)
    if (!showComments && comments.length === 0) {
      loadComments()
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setPostingComment(true)
    try {
      const response = await api.createComment({
        decision_id: decision.id,
        content: newComment.trim()
      })
      setComments([response.data, ...comments])
      setNewComment('')
    } catch (err) {
      console.error('Failed to post comment:', err)
      alert('Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
      alert('Failed to delete comment')
    }
  }

  const handleDeleteDecision = async () => {
    if (!window.confirm('Are you sure you want to delete this decision? This action cannot be undone.')) {
      return
    }

    console.log('Deleting decision:', decision.id, 'currentUserId:', currentUserId, 'decision.user_id:', decision.user_id, 'decision.user?.id:', decision.user?.id)

    try {
      await api.deleteDecision(decision.id)
      if (onDelete) {
        onDelete(decision.id)
      }
    } catch (err) {
      console.error('Failed to delete decision:', err)
      alert('Failed to delete decision: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleAIRecommendation = async () => {
    if (aiRecommendation) {
      setAiRecommendation(null) // Toggle off
      return
    }

    setLoadingAI(true)
    try {
      const response = await api.getConsensusRecommendation(decision.content)
      setAiRecommendation(response.data.recommendation)
    } catch (err) {
      console.error('Failed to get AI recommendation:', err)
      alert('Failed to get AI recommendation')
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="decision-card">
      <div className="decision-header">
        <Link to={`/profile/${user.id || decision.user_id}`} className="user-link">
          <div className="user-avatar-small">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="username">{user.username || 'Unknown'}</span>
        </Link>
        <span className="decision-date">
          {new Date(decision.created_at).toLocaleDateString()}
        </span>
        {currentUserId && (decision.user?.id === currentUserId || decision.user_id === currentUserId) && (
          <button
            className="btn-link btn-small delete-btn"
            onClick={handleDeleteDecision}
            title="Delete decision"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      <div className="decision-main">
        <div className="decision-content-section">
          <div className="decision-content">
            <p>{decision.content}</p>
          </div>

          <div className="decision-options">
            <div
              className={`option option-a ${userVote === 'option_a' ? 'selected' : ''}`}
              onClick={() => onVote(decision.id, userVote === 'option_a' ? null : 'option_a')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onVote(decision.id, userVote === 'option_a' ? null : 'option_a')
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                '--vote-percentage': `${optionAPercentage}%`,
                '--is-majority': optionAPercentage > 50 ? '1' : '0'
              }}
            >
              <div className="option-content">
                <span className="option-label">A:</span>
                <span className="option-text">{decision.option_a}</span>
              </div>
              {totalVotes > 0 && (
                <div className="option-percentage">
                  <span className="percentage-number">{optionAPercentage}%</span>
                </div>
              )}
            </div>
            <div
              className={`option option-b ${userVote === 'option_b' ? 'selected' : ''}`}
              onClick={() => onVote(decision.id, userVote === 'option_b' ? null : 'option_b')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onVote(decision.id, userVote === 'option_b' ? null : 'option_b')
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                '--vote-percentage': `${optionBPercentage}%`,
                '--is-majority': optionBPercentage > 50 ? '1' : '0'
              }}
            >
              <div className="option-content">
                <span className="option-label">B:</span>
                <span className="option-text">{decision.option_b}</span>
              </div>
              {totalVotes > 0 && (
                <div className="option-percentage">
                  <span className="percentage-number">{optionBPercentage}%</span>
                </div>
              )}
            </div>
          </div>

          {aiRecommendation && (
            <div className="ai-recommendation">
              <div className="ai-header">
                <span className="ai-label">🤖 AI Recommendation</span>
                <button
                  className="btn-link btn-small"
                  onClick={() => setAiRecommendation(null)}
                  title="Close AI recommendation"
                >
                  ✕
                </button>
              </div>
              <p className="ai-text">{aiRecommendation}</p>
            </div>
          )}
        </div>

        <div className="decision-actions">
          <div>
            <button
              className="action-btn comments-action"
              onClick={handleShowComments}
              title="Comments"
            >
              💬
            </button>
            <div className="action-label">{comments.length}</div>
          </div>

          <div>
            <button
              className="action-btn ai-action"
              onClick={handleAIRecommendation}
              disabled={loadingAI}
              title="AI Recommendation"
            >
              {loadingAI ? '🤖' : '🧠'}
            </button>
            <div className="action-label">AI</div>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="decision-comments">
          <div className="comments-section">
            {currentUserId && (
              <form onSubmit={handlePostComment} className="comment-form">
                <textarea
                  className="input-field"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={postingComment}
                  rows={2}
                />
                <button
                  type="submit"
                  className="btn-primary btn-small"
                  disabled={postingComment || !newComment.trim()}
                >
                  {postingComment ? 'Posting...' : 'Post'}
                </button>
              </form>
            )}

            {loadingComments ? (
              <div className="loading-comments">
                <div className="spinner-small"></div>
                Loading comments...
              </div>
            ) : (
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="no-comments">No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment">
                      <div className="comment-header">
                        <Link to={`/profile/${comment.user.id}`} className="user-link">
                          <div className="user-avatar-small">
                            {comment.user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="username">{comment.user.username}</span>
                        </Link>
                        <span className="comment-date">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                        {currentUserId === comment.user_id && (
                          <button
                            className="btn-link btn-small"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="comment-content">
                        <p>{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DecisionCard
