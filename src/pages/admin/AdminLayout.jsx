import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../dashboard/Dashboard.css' // Reuse the main dashboard styles
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  BookOpen,
  GraduationCap
} from 'lucide-react'

const AdminLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const navSections = [
    {
      title: 'Main',
      links: [
        { label: 'Dashboard', to: '/admin', end: true, icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      title: 'Academic',
      links: [
        { label: 'Students', to: '/admin/students', icon: <Users size={20} /> },
        { label: 'Faculty', to: '/admin/faculty', icon: <GraduationCap size={20} /> },
        { label: 'Subjects', to: '/admin/subjects', icon: <BookOpen size={20} /> },
        { label: 'Classes (V1)', to: '/admin/classes', icon: <BookOpen size={20} /> },
      ],
    },
    {
      title: 'System',
      links: [
        { label: 'Settings', to: '/admin/settings', icon: <Settings size={20} /> },
      ],
    },
  ]

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" style={{ background: 'var(--c-text-primary)' }}>///</div>
          <div>
            <p className="brand-title">EduPredict</p>
            <p className="nav-section-title" style={{ paddingLeft: 0, marginBottom: 0 }}>Admin Panel</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navSections.map((section) => (
            <div className="nav-group" key={section.title} style={{ marginBottom: '12px' }}>
              <p className="nav-section-title">{section.title}</p>
              <ul>
                {section.links.map((link) => (
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
            </div>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-link logout-btn">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <h1>Administration</h1>
          </div>

          <div className="topbar-actions">
            <div className="user-profile-chip" style={{ borderColor: 'var(--c-text-primary)' }}>
              <div className="avatar" style={{ background: 'var(--c-text-primary)' }}>
                A
              </div>
              <div className="info">
                <span className="name">Administrator</span>
                <span className="role">System Access</span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
