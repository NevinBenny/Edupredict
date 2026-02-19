import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { getAccountProfile } from '../../services/api'
import CompleteProfileModal from '../../components/CompleteProfileModal'
import './Dashboard.css'
import icon from '../../assets/icon.png'

const navSections = [
  {
    links: [
      { label: 'Dashboard', to: '/dashboard', end: true },
      { label: 'Students', to: '/dashboard/students' },
      { label: 'Risk Analysis', to: '/dashboard/ai-risk' },
      { label: 'Interventions', to: '/dashboard/interventions' },
      { label: 'Reports', to: '/dashboard/reports' },
    ],
  },
]

const DashboardLayout = () => {
  const { logout } = useAuth()
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    role: 'USER'
  })
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)

  const loadProfile = async () => {
    try {
      const data = await getAccountProfile()
      const profile = data.profile || {}

      setUserProfile({
        name: profile.full_name || data.email?.split('@')[0] || 'User',
        email: data.email || '',
        role: data.role || 'USER'
      })

      // Check if profile is incomplete
      // Consider it incomplete if full_name, phone_number, or country is missing
      const isProfileIncomplete = !profile.full_name || !profile.phone_number || !profile.country
      if (isProfileIncomplete) {
        setShowCompleteProfile(true)
      }
    } catch (err) {
      console.error('Failed to load user profile:', err)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleProfileComplete = () => {
    loadProfile() // Reload to get updated name etc.
  }

  return (
    <div className="dashboard-shell">
      <CompleteProfileModal
        isOpen={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
        onComplete={handleProfileComplete}
      />

      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">EP</div>
          <div>
            <p className="brand-title">EduPredict</p>
            <p className="nav-section-title" style={{ margin: 0 }}>Faculty Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <ul>
            {navSections[0].links.map((link) => (
              <li key={link.label}>
                <NavLink
                  to={link.to}
                  end={Boolean(link.end)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={logout}
            className="nav-link"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#d14343'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar minimal">
          <div className="topbar-left">
            <h1 className="portal-title">Faculty Portal</h1>
          </div>
          <div className="topbar-actions">
            <div className="notifications-icon">
              <span className="dot"></span>
              🔔
            </div>
            <NavLink to="/dashboard/account" className="user-profile-chip">
              <div className="avatar">{userProfile.name.charAt(0)}</div>
              <div className="info">
                <span className="name">{userProfile.name}</span>
                <span className="role">Faculty</span>
              </div>
            </NavLink>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet context={{ userProfile }} />
        </main>
      </div>
    </div >
  )
}

export default DashboardLayout
