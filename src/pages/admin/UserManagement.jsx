import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import FormField from '../../components/admin/FormField'
import { fetchAllUsers } from '../../services/api'
import { UserPlus, Search } from 'lucide-react'
import '../dashboard/Dashboard.css'

/**
 * UserManagement - Admin page for managing user accounts
 */
const UserManagement = () => {
  // Real user data from API
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'USER' })
  const [errors, setErrors] = useState({})

  // Fetch users from API on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        const response = await fetchAllUsers()
        // Map API response to component data structure
        const mappedUsers = response.users.map((user) => ({
          id: user.id,
          name: user.email.split('@')[0], // Use part of email as name if name not available
          email: user.email,
          role: user.role,
          status: user.status || 'active',
          joinDate: new Date(user.createdAt).toISOString().split('T')[0] || 'N/A',
        }))
        setUsers(mappedUsers)
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load users')
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddUser = () => {
    setFormData({ name: '', email: '', role: 'USER' })
    setErrors({})
    setIsModalOpen(true)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email'
    return newErrors
  }

  const handleCreateUser = () => {
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const newUser = {
      id: users.length + 1,
      ...formData,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    }

    setUsers([...users, newUser])
    setIsModalOpen(false)
    setFormData({ name: '', email: '', role: 'USER' })
  }

  const handleDeleteUser = (user) => {
    if (confirm(`Delete user ${user.name}?`)) {
      setUsers(users.filter((u) => u.id !== user.id))
    }
  }

  const handleToggleStatus = (user) => {
    setUsers(
      users.map((u) =>
        u.id === user.id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u,
      ),
    )
  }

  const columns = [
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'email', label: 'Email', width: '200px' },
    { key: 'role', label: 'Role', width: '100px', render: (value) => <span className="role-badge">{value}</span> },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (value) => <span className={`status-pill ${value === 'active' ? 'low' : 'high'}`}>{value}</span>,
    },
    { key: 'joinDate', label: 'Joined', width: '120px' },
  ]

  const actions = [
    {
      label: (user) => (user.status === 'active' ? 'Deactivate' : 'Activate'),
      variant: 'secondary',
      onClick: handleToggleStatus,
    },
    { label: 'Delete', variant: 'danger', onClick: handleDeleteUser },
  ]

  const modalFooter = (
    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
      <button className="btn-secondary-action" onClick={() => setIsModalOpen(false)}>
        Cancel
      </button>
      <button className="btn-primary" onClick={handleCreateUser}>
        Create User
      </button>
    </div>
  )

  return (
    <div className="dash-container minimal">
      <div className="section-header">
        <div>
          <h3>User Management</h3>
          <p>Manage student accounts and administrative users</p>
        </div>
        <button className="btn-primary" onClick={handleAddUser} disabled={loading}>
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <p>Error loading users: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="dash-loading">
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="primary-section">
          {/* Controls */}
          <div className="table-controls">
            <div className="search-box-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-modern"
              />
            </div>
            <div className="control-stats" style={{ color: 'var(--c-text-tertiary)', fontSize: '13px' }}>
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Users Table */}
          <DataTable columns={columns} rows={filteredUsers} actions={actions} />
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Create New User"
        onClose={() => setIsModalOpen(false)}
        footer={modalFooter}
      >
        <div className="form-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            error={errors.name}
            placeholder="John Doe"
            required
          />
          <FormField
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleFormChange}
            error={errors.email}
            placeholder="john@ajce.in"
            required
          />
          <div className="form-group">
            <label htmlFor="role">
              Role <span className="required">*</span>
            </label>
            <div className="select-wrapper">
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                className="form-input"
              >
                <option value="USER">Student/Staff (USER)</option>
                <option value="ADMIN">Administrator (ADMIN)</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default UserManagement
