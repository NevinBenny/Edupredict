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
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  Stethoscope,
  FileText,
  LogOut,
  Bell,
  User
} from 'lucide-react'

const facultyNav = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Student Roster', to: '/dashboard/students', icon: Users },
  { label: 'Risk Analysis', to: '/dashboard/ai-risk', icon: PieChart },
  { label: 'Interventions', to: '/dashboard/interventions', icon: Handshake },
  { label: 'Reports Centre', to: '/dashboard/reports', icon: FileBarChart },
]

const studentNav = [
  { label: 'My Courses', to: '/dashboard', icon: LayoutDashboard, end: true },
]

const DashboardLayout = () => {
  const { logout } = useAuth()
  const location = useLocation()
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
                  {link.icon}
                  <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button onClick={logout} className="nav-link logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <h1 className="portal-title">
              {pageTitle}
            </h1>
          </div>
          <div className="topbar-actions">
            <div className="notifications-icon">
              <span className="dot"></span>
              <Bell size={20} />
            </div>
            <NavLink to="/dashboard/account" className="user-profile-chip">
              <div className="avatar">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="info">
                <span className="name">{userProfile.name}</span>
                <span className="role">{userProfile.role === 'FACULTY' ? 'Faculty' : 'Student'}</span>
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
