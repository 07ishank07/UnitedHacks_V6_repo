import { useState, useEffect } from 'react'
import { api } from '../api'
import './LifeAreasDashboard.css'

function LifeAreasDashboard({ userId }) {
  const [lifeAreasData, setLifeAreasData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLifeAreasData()
  }, [userId])

  const loadLifeAreasData = async () => {
    try {
      setLoading(true)
      const response = await api.getUserLifeAreas(userId)
      setLifeAreasData(response.data)
    } catch (err) {
      console.error('Failed to load life areas:', err)
      setError('Failed to load life areas analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="life-areas-dashboard">
        <div className="dashboard-loading">
          <div className="spinner-large"></div>
          <p>Analyzing your decision patterns...</p>
        </div>
      </div>
    )
  }

  if (error || !lifeAreasData) {
    return (
      <div className="life-areas-dashboard">
        <div className="dashboard-error">
          <p>{error || 'No life areas data available'}</p>
          <button onClick={loadLifeAreasData} className="btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { life_areas, recommendations } = lifeAreasData

  const lifeAreas = [
    {
      key: 'career',
      label: 'Career',
      percentage: life_areas.career,
      color: '#FF6B6B',
      recommendation: recommendations.career
    },
    {
      key: 'relationships',
      label: 'Relationships',
      percentage: life_areas.relationships,
      color: '#4ECDC4',
      recommendation: recommendations.relationships
    },
    {
      key: 'future',
      label: 'Future',
      percentage: life_areas.future,
      color: '#45B7D1',
      recommendation: recommendations.future
    },
    {
      key: 'personal_growth',
      label: 'Personal Growth',
      percentage: life_areas.personal_growth,
      color: '#96CEB4',
      recommendation: recommendations.personal_growth
    }
  ]

  return (
    <div className="life-areas-dashboard">
      <div className="dashboard-header">
        <h2>🤖 Life Areas Analysis</h2>
        <p className="dashboard-subtitle">
          AI-powered insights based on your decision-making patterns
        </p>
      </div>

      <div className="dashboard-content">
        <div className="charts-grid">
          {lifeAreas.map((area) => (
            <LifeAreaCard
              key={area.key}
              area={area}
            />
          ))}
        </div>

        <div className="insights-summary">
          <h3>💡 Key Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <strong>Strongest Area:</strong>{' '}
              {lifeAreas.reduce((prev, current) =>
                (prev.percentage > current.percentage) ? prev : current
              ).label}
            </div>
            <div className="insight-item">
              <strong>Areas for Focus:</strong>{' '}
              {lifeAreas
                .filter(area => area.percentage < 60)
                .map(area => area.label)
                .join(', ') || 'All areas well-developed!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LifeAreaCard({ area }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    // Animate from 0 to target percentage
    const duration = 2000 // 2 seconds
    const steps = 60
    const increment = area.percentage / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const nextValue = currentStep * increment
      setAnimatedPercentage(currentStep >= steps ? area.percentage : nextValue)

      if (currentStep >= steps) {
        clearInterval(timer)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [area.percentage])

  // Calculate donut chart paths
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference

  return (
    <div className="life-area-card">
      <div className="area-header">
        <h4>{area.label}</h4>
        <div className="percentage-display">
          <span className="percentage-number">{Math.round(animatedPercentage)}%</span>
        </div>
      </div>

      <div className="donut-chart-container">
        <svg className="donut-chart" width="120" height="120" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={area.color}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="donut-progress"
          />
        </svg>
      </div>

      <div className="area-recommendation">
        <p className="recommendation-text">{area.recommendation}</p>
      </div>
    </div>
  )
}

export default LifeAreasDashboard
