import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import FormField from '../../components/admin/FormField'
import { fetchAdmins, addAdmin, toggleAdminRetire, makeAdminDefault } from '../../services/api'
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import './AdminPanel.css'

/**
 * UserManagement - Admin page for managing administrative user accounts
 * Features:
 * - View all admins in a table
 * - Create new admins
 * - Retire/Unretire admins
 * - Make an admin the "Default" admin
 */
const UserManagement = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ email: '' })
  const [errors, setErrors] = useState({})

  const [isCreating, setIsCreating] = useState(false)
  const [newCredentials, setNewCredentials] = useState(null)

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetchAdmins()

      const mappedAdmins = response.admins.map((admin) => ({
        id: admin.id,
        name: admin.email.split('@')[0],
        email: admin.email,
        status: admin.status || 'ACTIVE',
        isDefault: admin.is_default === 1,
        joinDate: admin.created_at ? new Date(admin.created_at).toISOString().split('T')[0] : 'N/A',
      }))

      setAdmins(mappedAdmins)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load admins')
      console.error('Error fetching admins:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' })
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const resp = await addAdmin({ email: formData.email })
      setNewCredentials(resp.credentials)
      loadAdmins()
    } catch (err) {
      alert(err.message || 'Failed to create admin')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleRetire = async (admin) => {
    if (admin.isDefault) {
      alert("Cannot retire the default admin account.")
      return
    }
    const action = admin.status === 'ACTIVE' ? 'retire' : 'restore'
    if (confirm(`Are you sure you want to ${action} ${admin.email}?`)) {
      try {
        await toggleAdminRetire(admin.id)
        loadAdmins()
      } catch (err) {
        alert(err.message || `Failed to ${action} admin`)
      }
    }
  }

  const handleMakeDefault = async (admin) => {
    if (admin.status === 'RETIRED') {
      alert("Cannot make a retired admin the default admin.")
      return
    }
    if (confirm(`Make ${admin.email} the default admin? This will remove default status from the current default.`)) {
      try {
        await makeAdminDefault(admin.id)
        loadAdmins()
      } catch (err) {
        alert(err.message || "Failed to make admin default")
      }
    }
  }

  const columns = [
    { key: 'email', label: 'Email', width: '250px' },
    {
      key: 'isDefault',
      label: 'Role Level',
      width: '150px',
      render: (isDefault) => isDefault ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--c-primary)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> Default
        </span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--c-text-secondary)' }}>
          <Shield size={16} /> Standard
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (status) => (
        <span className={`status-badge status-${status.toLowerCase()}`}>
          {status}
        </span>
      ),
    },
    { key: 'joinDate', label: 'Joined', width: '120px' },
  ]

  const actions = [
    {
      label: (admin) => (admin.status === 'ACTIVE' ? 'Retire' : 'Restore'),
      variant: 'secondary',
      onClick: handleToggleRetire,
    },
    {
      label: 'Make Default',
      variant: 'primary',
      onClick: handleMakeDefault,
    }
  ]

  return (
    <div className="admin-page">
      <section className="page-header">
        <div className="header-content">
          <h2>Admin Management</h2>
          <p className="header-subtitle">Watch, retire, and manage administrative privileges</p>
        </div>
        <button className="primary-btn" onClick={() => { setIsModalOpen(true); setNewCredentials(null); setFormData({ email: '' }); }} disabled={loading}>
          + Create Admin
        </button>
      </section>

      {error && (
        <section className="alert alert-error">
          <p>{error}</p>
        </section>
      )}

      {loading ? (
        <section className="page-content">
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Loading admins...</p>
          </div>
        </section>
      ) : (
        <>
          <section className="page-controls">
            <input
              type="search"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Search admins"
            />
            <div className="control-stats">
              Showing {filteredAdmins.length} of {admins.length} admins
            </div>
          </section>

          <section className="page-content">
            <DataTable columns={columns} rows={filteredAdmins} actions={actions} />
          </section>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        title={newCredentials ? "Admin Created" : "Create New Admin"}
        onClose={() => setIsModalOpen(false)}
      >
        {!newCredentials ? (
          <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                required
                onChange={e => { setFormData({ email: e.target.value }); setErrors({}); }}
                placeholder="admin@ajce.in"
              />
              {errors.email && <small style={{ color: 'red' }}>{errors.email}</small>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
              <ShieldAlert size={32} />
            </div>
            <h3 style={{ margin: 0 }}>Provisioning Complete</h3>
            <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)' }}>
              Admin account created for <b>{newCredentials.email}</b>
            </p>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', width: '100%', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>Temporary Password</p>
              <code style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>{newCredentials.password}</code>
            </div>
            <button className="secondary-btn" onClick={() => setIsModalOpen(false)} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default UserManagement
