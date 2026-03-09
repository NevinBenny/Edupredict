import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  PieChart,
  Handshake,
  FileBarChart,
  LogOut
} from 'lucide-react'
import { getAccountProfile } from '../../services/api'
import CompleteProfileModal from '../../components/CompleteProfileModal'
import './Dashboard.css'

const facultyNav = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Student Roster', to: '/dashboard/students', icon: Users },
  { label: 'Risk Analysis', to: '/dashboard/ai-risk', icon: PieChart },
  { label: 'Interventions', to: '/dashboard/interventions', icon: Handshake },
  { label: 'Reports Centre', to: '/dashboard/reports', icon: FileBarChart },
]

const studentNav = [
  { label: 'My Courses', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'My Interventions', to: '/dashboard/interventions', icon: Handshake },
]

const DashboardLayout = () => {
  const { logout } = useAuth()
  const location = useLocation()
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    role: 'STUDENT'
  })
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)

  const loadProfile = async () => {
    try {
      const data = await getAccountProfile()
      const profile = data.profile || {}

      setUserProfile({
        name: profile.full_name || data.email?.split('@')[0] || 'User',
        email: data.email || '',
        role: data.role || 'STUDENT'
      })

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
    loadProfile()
  }

  // Determine page title based on current path
  const allNavs = [...facultyNav, ...studentNav]
  const currentNav = allNavs.find(n => {
    if (n.end) return location.pathname === n.to;
    return location.pathname.startsWith(n.to);
  })

  const pageTitle = currentNav ? currentNav.label.toUpperCase() : (userProfile.role === 'FACULTY' ? 'FACULTY PORTAL' : 'STUDENT PORTAL')

  return (
    <div className="dashboard-shell">
      <CompleteProfileModal
        isOpen={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
        onComplete={handleProfileComplete}
      />

      <aside className="dashboard-sidebar">
        <div className="sidebar-brand" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="brand-mark">EP</div>
          <div>
            <p className="brand-title">EduPredict</p>
            <p className="nav-section-title" style={{ margin: 0 }}>
              {userProfile.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <ul>
            {(userProfile.role === 'FACULTY' ? facultyNav : studentNav).map((link) => (
              <li key={link.label}>
                <NavLink
                  to={link.to}
                  end={Boolean(link.end)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                  style={{ gap: '12px' }}
                >
                  <link.icon size={18} />
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
              color: '#ef4444',
              gap: '12px'
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar minimal">
          <div className="topbar-left">
            <h1 className="portal-title">
              {pageTitle}
            </h1>
          </div>
          <div className="topbar-actions">
            {/* Notifications and Profile removed as requested previously */}
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div >
  )
}

export default DashboardLayout
