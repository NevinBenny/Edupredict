import { useState, useEffect } from 'react'
import StatCard from '../../components/admin/StatCard'
import { fetchAdminStats } from '../../services/api'

/**
 * AdminDashboard - Overview of system metrics and health
 * Displays:
 * - Total Students
 * - Total Faculty
 * - High Risk Students
 * - Quick action buttons
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    highRiskStudents: 0,
  })

  const [loading, setLoading] = useState(true)

  // Fetch admin statistics from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchAdminStats()

        setStats({
          totalStudents: response.totalStudents || 0,
          totalFaculty: response.totalFaculty || 0,
          highRiskStudents: response.highRiskStudents || 0,
        })
      } catch (err) {
        console.error('Error loading dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    window.location.reload()
  }

  return (
    <div className="admin-dashboard">
      {/* System Overview Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Academic Overview</h2>
          <button className="secondary-btn" onClick={handleRefresh} disabled={loading}>
            REFRESH
          </button>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total Students"
            value={loading ? '...' : stats.totalStudents}
            subtitle="Enrolled students"
            variant="users"
          />
          <StatCard
            title="Total Faculty"
            value={stats.totalFaculty}
            subtitle="Academic staff"
            variant="devices" // Reusing style but different content
          />
          <StatCard
            title="High Risk Students"
            value={stats.highRiskStudents}
            subtitle="Require intervention"
            variant="alerts"
            trend={{ direction: stats.highRiskStudents > 0 ? 'down' : 'up', text: 'Critical' }}
          />

        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <a href="/admin/users" className="action-card">
            <span className="action-icon">🛡️</span>
            <h3>Manage Admins</h3>
            <p>Create, watch, or retire admin accounts</p>
          </a>
          <a href="/admin/faculty" className="action-card">
            <span className="action-icon">👨‍🏫</span>
            <h3>Manage Faculty</h3>
            <p>Add or remove academic staff</p>
          </a>
          <a href="/admin/students" className="action-card">
            <span className="action-icon">🎓</span>
            <h3>Manage Students</h3>
            <p>View student performance and specific details</p>
          </a>
          <a href="/admin/settings" className="action-card">
            <span className="action-icon">⚙️</span>
            <h3>System Settings</h3>
            <p>Configure grade thresholds and preferences</p>
          </a>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard


