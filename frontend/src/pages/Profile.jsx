import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import DecisionCard from '../components/DecisionCard'
import LifeAreasDashboard from '../components/LifeAreasDashboard'
import './Profile.css'

function Profile({ currentUser }) {
  const { userId } = useParams()
  const profileUserId = userId ? parseInt(userId) : currentUser.id
  const isOwnProfile = profileUserId === currentUser.id

  const [user, setUser] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [personality, setPersonality] = useState(null)
  const [showPersonality, setShowPersonality] = useState(false)
  const [loadingPersonality, setLoadingPersonality] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [profileUserId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const [userResponse, decisionsResponse] = await Promise.all([
        api.getUser(profileUserId),
        api.getUserDecisions(profileUserId)
      ])
      setUser(userResponse.data)
      setDecisions(decisionsResponse.data)

      // Check if current user follows this profile
      if (!isOwnProfile) {
        try {
          const followingResponse = await api.getFollowing(currentUser.id)
          const followingIds = followingResponse.data.map(u => u.id)
          setIsFollowing(followingIds.includes(profileUserId))
        } catch (err) {
          console.error('Failed to check follow status:', err)
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await api.unfollowUser(currentUser.id, profileUserId)
      } else {
        await api.followUser(currentUser.id, profileUserId)
      }
      setIsFollowing(!isFollowing)
      loadProfile() // Reload to update follower count
    } catch (err) {
      console.error('Failed to follow/unfollow:', err)
      alert('Failed to update follow status')
    }
  }

  const loadPersonality = async () => {
    if (personality) {
      setShowPersonality(true)
      return
    }

    try {
      setLoadingPersonality(true)
      const response = await api.getUserPersonality(profileUserId)
      setPersonality(response.data.personality_report)
      setShowPersonality(true)
    } catch (err) {
      console.error('Failed to load personality:', err)
      alert('Failed to load personality analysis')
    } finally {
      setLoadingPersonality(false)
    }
  }

  const handleDeleteDecision = (decisionId) => {
    setDecisions(decisions.filter(d => d.id !== decisionId))
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner-large"></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-error">
        <p>User not found</p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1>{user.username}</h1>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{user.decisions_count || 0}</span>
              <span className="stat-label">Decisions</span>
            </div>
            <div className="stat">
              <span className="stat-value">{user.followers_count || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-value">{user.following_count || 0}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          {isOwnProfile ? (
            <>
              <Link to="/settings" className="btn-secondary">
                Settings
              </Link>
              <Link to="/leaderboard" className="btn-secondary">
                Leaderboard
              </Link>
            </>
          ) : (
            <button
              className={isFollowing ? 'btn-secondary' : 'btn-primary'}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {isOwnProfile && (
          <button
            className="btn-secondary"
            onClick={loadPersonality}
            disabled={loadingPersonality}
          >
            {loadingPersonality ? (
              <>
                <div className="spinner-small"></div>
                Analyzing...
              </>
            ) : (
              `${showPersonality ? 'Hide' : 'View'} AI Personality Analysis`
            )}
          </button>
        )}

        {showPersonality && personality && (
          <div className="personality-card">
            <h3>AI Personality Analysis</h3>
            <p className="personality-text">{personality}</p>
          </div>
        )}

        {isOwnProfile && <LifeAreasDashboard userId={profileUserId} />}

        <div className="profile-section">
          <h2>Decisions</h2>
          <div className="decisions-feed">
            {decisions.length === 0 ? (
              <div className="empty-state">
                <p>No decisions yet.</p>
                {isOwnProfile && (
                  <Link to="/create" className="btn-primary">
                    Create Your First Decision
                  </Link>
                )}
              </div>
            ) : (
              decisions.map(decision => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  currentUserId={currentUser.id}
                  onVote={(decisionId, choice) => {
                    // Reload profile decisions after voting
                    api.createVote({
                      user_id: currentUser.id,
                      decision_id: decisionId,
                      choice
                    }).then(() => loadProfile())
                  }}
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

export default Profile
