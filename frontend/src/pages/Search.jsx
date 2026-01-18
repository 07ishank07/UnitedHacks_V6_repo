import { useState, useEffect } from 'react'
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
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [query])

  // Live search effect
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        // Load recommendations when no query
        loadRecommendations()
        return
      }

      setLoading(true)
      try {
        if (searchType === 'decisions') {
          const response = await api.getDecisions({ search: debouncedQuery })
          setDecisions(response.data)
          setUsers([])
        } else {
          const response = await api.searchUsers(debouncedQuery)
          setUsers(response.data)
          setDecisions([])
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, searchType])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      if (searchType === 'decisions') {
        // Load trending decisions (recent with most votes)
        const response = await api.getDecisions({ limit: 20 })
        setDecisions(response.data)
        setUsers([])
      } else {
        // Load popular users (with most followers)
        const response = await api.searchUsers('')
        setUsers(response.data)
        setDecisions([])
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

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
        <h1>Search</h1>
        <p className="page-subtitle">Find decisions or users</p>
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
            ) : decisions.length === 0 && !query ? (
              <div className="empty-state">
                <p>Loading recommendations...</p>
              </div>
            ) : (
              <>
                {!query && <h2 className="section-title">Trending Decisions</h2>}
                {decisions.map(decision => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    currentUserId={currentUser.id}
                    onVote={handleVote}
                    onDelete={handleDeleteDecision}
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="users-list">
            {users.length === 0 && query ? (
              <div className="empty-state">
                <p>No users found matching "{query}"</p>
              </div>
            ) : users.length === 0 && !query ? (
              <div className="empty-state">
                <p>Loading recommendations...</p>
              </div>
            ) : (
              <>
                {!query && <h2 className="section-title">Popular Users</h2>}
                {users.map(user => (
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
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Search
