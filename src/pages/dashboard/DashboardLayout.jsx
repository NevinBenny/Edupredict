import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  PieChart,
  Handshake,
  FileBarChart,
  LogOut,
  User,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { getAccountProfile } from '../../services/api'
import CompleteProfileModal from '../../components/CompleteProfileModal'
import icon from '../../assets/icon.png'
import './Dashboard.css'

const facultyNav = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { label: 'My Courses', to: '/dashboard/my-courses', icon: <ChevronRight size={18} /> },
  { label: 'Student Roster', to: '/dashboard/students', icon: <Users size={18} /> },
  { label: 'Risk Analysis', to: '/dashboard/ai-risk', icon: <PieChart size={18} /> },
  { label: 'Interventions', to: '/dashboard/interventions', icon: <Handshake size={18} /> },
  { label: 'Reports Centre', to: '/dashboard/reports', icon: <FileBarChart size={18} /> },
]

const studentNav = [
  { label: 'My Courses', to: '/dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { label: 'My Interventions', to: '/dashboard/interventions', icon: <Handshake size={18} /> },
]

const DashboardLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    role: 'STUDENT',
    detail: '' // Student ID or Faculty Designation
  })
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const loadProfile = async () => {
    try {
      const data = await getAccountProfile()
      const profile = data.profile || {}

      setUserProfile({
        name: profile.full_name || data.email?.split('@')[0] || 'User',
        email: data.email || '',
        role: data.role || 'STUDENT',
        detail: data.role === 'STUDENT' ? (profile.student_id || 'Student') : (profile.designation || 'Faculty')
      })

      const isProfileIncomplete = !profile.full_name
      if (isProfileIncomplete && data.role === 'FACULTY') {
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

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  // Determine page title based on current path
  const allNavs = [...facultyNav, ...studentNav]
  const currentNav = allNavs.find(n => {
    if (n.end) return location.pathname === n.to;
    return location.pathname.startsWith(n.to);
  })

  const portalName = userProfile.role === 'FACULTY' ? 'FACULTY PORTAL' : 'STUDENT PORTAL'
  const pageTitle = currentNav ? currentNav.label : portalName

  return (
    <div className={`dashboard-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <CompleteProfileModal
        isOpen={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
        onComplete={handleProfileComplete}
      />

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={icon} alt="EduPredict" style={{ width: '28px', height: '28px' }} />
          <div>
            <p className="brand-title">EduPredict</p>
            <p className="brand-sub">{userProfile.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}</p>
          </div>
          <button className="menu-toggle mobile-only" onClick={toggleSidebar} style={{ marginLeft: 'auto', display: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <ul>
            {(userProfile.role === 'FACULTY' ? facultyNav : studentNav).map((link) => (
              <li key={link.label}>
                <NavLink
                  to={link.to}
                  end={Boolean(link.end)}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon">{link.icon}</span>
                  <span className="nav-label">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.1)',
            backdropFilter: 'blur(4px)',
            zIndex: 95
          }}
        />
      )}

      {/* Topbar */}
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <h1>
            <span style={{ color: 'var(--c-accent-primary)', opacity: 0.5 }}>///</span>
            {pageTitle}
          </h1>
        </div>

        <div className="topbar-right">
          <Link to="/dashboard/account" className="user-profile">
            <div className="profile-avatar">
              {userProfile.name[0].toUpperCase()}
            </div>
            <div className="profile-info">
              <p className="profile-name">{userProfile.name}</p>
              <p className="profile-role">{userProfile.detail || userProfile.role}</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 1024px) {
          .menu-toggle { display: block !important; }
        }
      `}} />
    </div>
  )
}

export default DashboardLayout
