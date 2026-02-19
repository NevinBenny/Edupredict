import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
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

const navSections = [
  {
    links: [
      { label: 'Dashboard', to: '/dashboard', end: true, icon: <LayoutDashboard size={20} /> },
      { label: 'Students', to: '/dashboard/students', icon: <Users size={20} /> },
      { label: 'Risk Analysis', to: '/dashboard/ai-risk', icon: <BrainCircuit size={20} /> },
      { label: 'Interventions', to: '/dashboard/interventions', icon: <Stethoscope size={20} /> },
      { label: 'Reports', to: '/dashboard/reports', icon: <FileText size={20} /> },
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
            <p className="nav-section-title" style={{ paddingLeft: 0, marginBottom: 0 }}>Faculty Portal</p>
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
            <h1>Overview</h1>
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
