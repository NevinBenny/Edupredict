import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Building2,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import icon from '../../assets/icon.png'
import './AdminPanel.css'

/**
 * AdminLayout - Main layout for admin panel with sidebar navigation
 * Features:
 * - Responsive sidebar with Lucide icons
 * - Mobile navigation toggle
 * - Glassmorphism topbar
 */
const AdminLayout = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)

  // Navigation sections for admin panel
  const navSections = [
    {
      title: 'Main',
      links: [
        { label: 'Dashboard', to: '/admin', end: true, icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Academic Management',
      links: [
        { label: 'Manage Admins', to: '/admin/users', icon: <ShieldCheck size={18} /> },
        { label: 'Manage Faculty', to: '/admin/faculty', icon: <UserCheck size={18} /> },
        { label: 'Manage Students', to: '/admin/students', icon: <GraduationCap size={18} /> },
        { label: 'Departments', to: '/admin/departments', icon: <Building2 size={18} /> },
        { label: 'Courses', to: '/admin/courses', icon: <BookOpen size={18} /> },
      ],
    },
    {
      title: 'System',
      links: [
        { label: 'Global Settings', to: '/admin/settings', icon: <Settings size={18} /> },
      ],
    },
  ]

  return (
    <div className={`admin-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={icon} alt="EduPredict" style={{ width: '28px', height: '28px' }} />
          <div>
            <p className="brand-title">EduPredict</p>
            <p className="brand-sub">Admin Control</p>
          </div>
          <button className="menu-toggle mobile-only" onClick={toggleSidebar} style={{ marginLeft: 'auto', display: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
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
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="nav-icon">{link.icon}</span>
                      <span className="nav-label">{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.1)',
            backdropFilter: 'blur(4px)',
            zIndex: 95
          }}
        />
      )}

      {/* Top Bar */}
      <header className="admin-topbar">
        <div className="topbar-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <h1>
            <span style={{ color: 'var(--c-accent-primary)', opacity: 0.5 }}>///</span>
            Administration
          </h1>
        </div>

        <div className="topbar-right">
          <Link to="/admin/account" className="user-profile" style={{ textDecoration: 'none' }}>
            <div className="profile-avatar">{user?.email?.[0].toUpperCase() || 'A'}</div>
            <div className="profile-info">
              <p className="profile-name">{user?.email?.split('@')[0] || 'Admin'}</p>
              <p className="profile-role">System Admin</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
