import { useState, useEffect } from 'react'
import {
  Users,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Settings,
  BookOpen,
  UserCheck
} from 'lucide-react'
import StatCard from '../../components/admin/StatCard'
import { fetchAdminStats } from '../../services/api'

/**
 * AdminDashboard - Overview of system metrics and health
 * Enhanced with Lucide icons and premium action cards
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
    // Small timeout for visual feedback
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <div className="admin-dashboard">
      {/* System Overview Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Academic Overview</h2>
          <button
            className="secondary-btn"
            onClick={handleRefresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
        </div>

        <div className="stats-grid">
          <StatCard
            title="Total Students"
            value={loading ? '...' : stats.totalStudents}
            subtitle="Enrolled students"
            icon={<Users size={24} />}
            variant="users"
          />
          <StatCard
            title="Total Faculty"
            value={stats.totalFaculty}
            subtitle="Academic staff"
            icon={<UserCheck size={24} />}
            variant="faculty"
          />
          <StatCard
            title="High Risk Students"
            value={stats.highRiskStudents}
            subtitle="Require intervention"
            icon={<AlertTriangle size={24} />}
            variant="alerts"
            trend={{
              direction: stats.highRiskStudents > 0 ? 'down' : 'up',
              text: stats.highRiskStudents > 0 ? 'Critical' : 'Stable'
            }}
          />
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="actions-grid">
          <a href="/admin/users" className="action-card action-admins">
            <div className="action-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <h3>Manage Admins</h3>
            <p>Create, watch, or retire admin accounts in the system.</p>
          </a>

          <a href="/admin/faculty" className="action-card action-faculty">
            <div className="action-icon-wrapper">
              <UserCheck size={24} />
            </div>
            <h3>Manage Faculty</h3>
            <p>Add or remove academic staff and assign departments.</p>
          </a>

          <a href="/admin/students" className="action-card action-students">
            <div className="action-icon-wrapper">
              <GraduationCap size={24} />
            </div>
            <h3>Manage Students</h3>
            <p>View student performance, risks, and specific details.</p>
          </a>

          <a href="/admin/settings" className="action-card action-settings">
            <div className="action-icon-wrapper">
              <Settings size={24} />
            </div>
            <h3>System Settings</h3>
            <p>Configure thresholds, grade scales, and system presets.</p>
          </a>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard


