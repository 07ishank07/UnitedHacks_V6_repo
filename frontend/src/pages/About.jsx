import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import './About.css'

function About() {
  const [aboutInfo, setAboutInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadAbout()
  }, [])

  const loadAbout = async () => {
    try {
      const response = await api.getAbout()
      setAboutInfo(response.data)
    } catch (err) {
      console.error('Failed to load about info:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner-large"></div>
      </div>
    )
  }

  return (
    <div className="about-page">
      <div className="page-header">
        <div className="header-with-back">
          <button 
            className="btn-back"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            ← Back
          </button>
          <h1>About Parallel</h1>
        </div>
      </div>

      <div className="about-content">
        <div className="about-card">
          <div className="logo-large">
            <span className="logo-gradient">Parallel</span>
          </div>
          <p className="about-description">
            {aboutInfo?.description || 'A decision-making social platform where users post binary choices, vote on others\' decisions, and compete on AI-powered leaderboards.'}
          </p>

          <div className="features-section">
            <h2>Features</h2>
            <ul className="features-list">
              {(aboutInfo?.features || []).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>

          <div className="info-section">
            <p>
              <strong>Version:</strong> {aboutInfo?.version || '1.0.0'}
            </p>
            <p className="text-muted">
              Built with FastAPI, React, and Google Gemini AI
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
