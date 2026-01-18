import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import './Search.css'

function Search({ currentUser }) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('decisions') // 'decisions' or 'users'
  const [decisions, setDecisions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      if (searchType === 'decisions') {
        const response = await api.getDecisions({ search: query })
        setDecisions(response.data)
        setUsers([])
      } else {
        const response = await api.searchUsers(query)
        setUsers(response.data)
        setDecisions([])
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
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
      // Reload search results
      if (searchType === 'decisions') {
        const response = await api.getDecisions({ search: query })
        setDecisions(response.data)
      }
    } catch (err) {
      console.error('Failed to vote:', err)
      alert('Failed to update vote')
    }
  }

  const handleDeleteDecision = (decisionId) => {
    setDecisions(decisions.filter(d => d.id !== decisionId))
  }

  return (
    <div className="search-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Search</h1>
            <p className="page-subtitle">Find decisions or users</p>
          </div>
          <Link to="/settings" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Settings
          </Link>
        </div>
      </div>

      <div className="search-form-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-tabs">
            <button
              type="button"
              className={`tab-btn ${searchType === 'decisions' ? 'active' : ''}`}
              onClick={() => setSearchType('decisions')}
            >
              Decisions
            </button>
            <button
              type="button"
              className={`tab-btn ${searchType === 'users' ? 'active' : ''}`}
              onClick={() => setSearchType('users')}
            >
              Users
            </button>
          </div>

          <div className="search-input-group">
            <input
              type="text"
              className="input-field"
              placeholder={searchType === 'decisions' ? 'Search decisions...' : 'Search users...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      <div className="search-results">
        {searchType === 'decisions' ? (
          <div className="decisions-feed">
            {decisions.length === 0 && query ? (
              <div className="empty-state">
                <p>No decisions found matching "{query}"</p>
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
        ) : (
          <div className="users-list">
            {users.length === 0 && query ? (
              <div className="empty-state">
                <p>No users found matching "{query}"</p>
              </div>
            ) : (
              users.map(user => (
                <Link
                  key={user.id}
                  to={`/profile/${user.id}`}
                  className="user-card"
                >
                  <div className="user-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-username">{user.username}</div>
                    {user.bio && <div className="user-bio">{user.bio}</div>}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Search
