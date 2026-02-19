import { useState, useEffect } from 'react'
import MetricCard from '../dashboard/MetricCard'
import { fetchAdminStats } from '../../services/api'
import { Users, GraduationCap, AlertTriangle, Activity, UserPlus, Settings } from 'lucide-react'
import '../dashboard/Dashboard.css'

/**
 * AdminDashboard - Overview of system metrics and health
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    highRiskStudents: 0,
    systemHealth: 98,
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
          systemHealth: 99,
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
    <div className="dash-container minimal">
      <div className="section-header">
        <div>
          <h3>Academic Overview</h3>
          <p>System performance and key metrics</p>
        </div>
        <button className="btn-secondary-action" onClick={handleRefresh} disabled={loading}>
          REFRESH
        </button>
      </div>

      <div className="stats-grid">
        <MetricCard
          label="Total Students"
          value={loading ? '...' : stats.totalStudents}
          icon={<Users size={20} />}
          color="#3b82f6"
        />
        <MetricCard
          label="Total Faculty"
          value={stats.totalFaculty}
          icon={<GraduationCap size={20} />}
          color="#8b5cf6"
        />
        <MetricCard
          label="High Risk"
          value={stats.highRiskStudents}
          icon={<AlertTriangle size={20} />}
          color="#ef4444"
          trend="down"
          trendValue="Critical"
        />
        <MetricCard
          label="System Health"
          value={`${stats.systemHealth}%`}
          icon={<Activity size={20} />}
          color="#10b981"
        />
      </div>

      <div className="primary-section">
        <div className="section-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <a href="/admin/users" className="card-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s' }}>
            <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '50%', color: '#3b82f6' }}><Users size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Manage Users</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--c-text-secondary)' }}>Create & edit accounts</p>
            </div>
          </a>
          <a href="/admin/faculty" className="card-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ background: '#F5F3FF', padding: '12px', borderRadius: '50%', color: '#8b5cf6' }}><GraduationCap size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Manage Faculty</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--c-text-secondary)' }}>Academic staff control</p>
            </div>
          </a>
          <a href="/admin/settings" className="card-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '50%', color: '#4B5563' }}><Settings size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>System Settings</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--c-text-secondary)' }}>Configure info</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard


