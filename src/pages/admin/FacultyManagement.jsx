import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import PasswordRevealModal from '../../components/admin/PasswordRevealModal'
import { getFaculties, addFaculty, updateFaculty, deleteFaculty, batchUploadFaculty, resetFacultyPassword } from '../../services/api'
import { Pencil, Trash2, Key, RefreshCw, Upload, Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import './AdminPanel.css'

const FacultyManagement = () => {
    const [faculties, setFaculties] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [deptFilter, setDeptFilter] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingFacultyId, setEditingFacultyId] = useState(null)
    const [newFaculty, setNewFaculty] = useState({
        name: '',
        email: '',
        department: '',
        designation: '',
        password: ''
    })

    // File upload state for Batch CSV
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [csvFile, setCsvFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [credentials, setCredentials] = useState(null)

    // Password reveal state
    const [revealModal, setRevealModal] = useState({ open: false, credentials: null })

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }

    useEffect(() => {
        fetchFaculties()
    }, [])

    const fetchFaculties = async () => {
        try {
            setLoading(true)
            const data = await getFaculties()
            setFaculties(data.faculties || [])
        } catch (err) {
            toast.error('Failed to load faculties')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditingFacultyId(null)
        setNewFaculty({ name: '', email: '', department: '', designation: '', password: '' })
        setShowAddModal(true)
    }

    const openEditModal = (faculty) => {
        setEditingFacultyId(faculty.id)
        setNewFaculty({
            name: faculty.name,
            email: faculty.email,
            department: faculty.department || '',
            designation: faculty.designation || '',
            password: 'KEEP_EXISTING' // Dummy for required field check if needed
        })
        setShowAddModal(true)
    }

    const handleFacultySubmit = async (e) => {
        e.preventDefault()

        if (!newFaculty.name || !newFaculty.email || (!editingFacultyId && !newFaculty.password)) {
            toast.error('Required fields are missing')
            return
        }

        try {
            if (editingFacultyId) {
                await updateFaculty(editingFacultyId, newFaculty)
                toast.success('Faculty updated successfully!')
            } else {
                await addFaculty(newFaculty)
                toast.success('Faculty added successfully!')
            }
            setShowAddModal(false)
            fetchFaculties()
        } catch (err) {
            toast.error(err.message || 'Failed to save faculty')
        }
    }

    const handleDelete = async (id) => {
        confirmToast('Are you sure you want to delete this faculty member?', async () => {
            try {
                await deleteFaculty(id)
                toast.success('Faculty deleted successfully')
                fetchFaculties()
            } catch (err) {
                toast.error('Failed to delete faculty')
            }
        })
    }

    const handleResetPassword = async (faculty) => {
        confirmToast(`Reset password for ${faculty.email}?`, async () => {
            try {
                const data = await resetFacultyPassword(faculty.id)
                setRevealModal({ open: true, credentials: { email: data.email, password: data.new_password } })
            } catch (err) {
                toast.error(err.message || 'Failed to reset password')
            }
        })
    }

    const handleFileUpload = async (e) => {
        e.preventDefault()
        if (!csvFile) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', csvFile)

        try {
            const data = await batchUploadFaculty(formData)
            setCredentials(data.credentials)
            fetchFaculties()
            toast.success(`Successfully processed ${data.credentials?.length} faculty accounts.`)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setUploading(false)
        }
    }

    const downloadCredentialsCSV = () => {
        if (!credentials || credentials.length === 0) return
        const header = "Email,Temporary Password\n"
        const rows = credentials.map(c => `${c.email},${c.password}`).join("\n")
        const blob = new Blob([header + rows], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `faculty_credentials_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const departments = [...new Set(faculties.map(f => f.department))].filter(Boolean).sort()

    const filteredFaculties = faculties.filter(f => {
        const matchesSearch =
            f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.designation?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDept = deptFilter === '' || f.department === deptFilter;

        return matchesSearch && matchesDept;
    })

    // Prepare table columns
    const columns = [
        {
            key: 'name',
            label: 'Name',
            render: (name) => (
                <div className="user-info-cell">
                    <div className="user-avatar-sm">{name[0]}</div>
                    <span>{name}</span>
                </div>
            )
        },
        { key: 'email', label: 'Email' },
        { key: 'department', label: 'Department' },
        { key: 'designation', label: 'Designation' },
        {
            key: 'created_at',
            label: 'Joined',
            render: (date) => new Date(date).toLocaleDateString()
        }
    ]

    const actions = [
        {
            label: 'Edit',
            icon: <Pencil size={15} />,
            variant: 'secondary',
            onClick: openEditModal
        },
        {
            label: 'Reset PWD',
            icon: <Key size={15} />,
            variant: 'secondary',
            onClick: handleResetPassword
        },
        {
            label: 'Delete',
            icon: <Trash2 size={15} />,
            variant: 'danger',
            onClick: (f) => handleDelete(f.id)
        }
    ]

    return (
        <div className="dash-container minimal">
            <div className="section-header">
                <div>
                    <h3>Faculty Management</h3>
                    <p>View and manage academic staff members</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="primary-btn" onClick={fetchFaculties}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="primary-btn" onClick={openCreateModal}>
                        + Add Faculty
                    </button>
                    <button className="primary-btn" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload size={16} /> Batch Upload CSV
                    </button>
                </div>
            </div>

            <section className="page-controls">
                <div className="search-box">
                    <Search className="search-icon" size={18} />
                    <input
                        type="search"
                        placeholder="Search faculty by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-group">
                    <Filter size={16} className="filter-icon" />
                    <select
                        className="filter-select"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>

                <div className="control-stats">
                    Showing <strong>{filteredFaculties.length}</strong> of {faculties.length} staff
                </div>
            </section>

            <div className="page-content">
                {loading ? (
                    <div className="dash-loading">Loading staff records...</div>
                ) : (
                    <DataTable
                        columns={columns}
                        rows={filteredFaculties}
                        actions={actions}
                    />
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingFacultyId ? 'Edit Faculty member' : 'Add New Faculty'}</h3>
                        <form onSubmit={handleFacultySubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={newFaculty.name}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    value={newFaculty.email}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                                    placeholder="john@ajce.in"
                                    required
                                    disabled={!!editingFacultyId}
                                    style={editingFacultyId ? { background: '#f1f5f9' } : {}}
                                />
                                {editingFacultyId && <small style={{ color: '#666' }}>Email cannot be changed after creation.</small>}
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <div className="select-wrapper">
                                    <select
                                        className="form-input"
                                        value={newFaculty.department}
                                        onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
                                    >
                                        <option value="">Select Department</option>
                                        <option value="Computer Science">Computer Science</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Mechanical">Mechanical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Designation</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={newFaculty.designation}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                                    placeholder="Assistant Professor"
                                />
                            </div>
                            {!editingFacultyId && (
                                <div className="form-group">
                                    <label>Temporary Password</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={newFaculty.password || ''}
                                            onChange={(e) => setNewFaculty({ ...newFaculty, password: e.target.value })}
                                            placeholder="Enter or generate a password"
                                            required
                                            minLength={8}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            className="secondary-btn"
                                            style={{ whiteSpace: 'nowrap' }}
                                            onClick={() => setNewFaculty({ ...newFaculty, password: generatePassword() })}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                    <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                                        User will be forced to change this on first login.
                                    </small>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="primary-btn">{editingFacultyId ? 'Update Faculty' : 'Create Account'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isUploadModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Batch Provision Faculty</h3>
                            <button className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setIsUploadModalOpen(false)}>×</button>
                        </div>
                        {!credentials ? (
                            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <p style={{ color: 'var(--c-text-secondary)' }}>
                                    Upload a CSV file with columns: <b>name, email, department, designation</b>.
                                    The backend will automatically create secure random passwords for each new faculty.
                                </p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    required
                                    onChange={e => setCsvFile(e.target.files[0])}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="secondary-btn" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="primary-btn" disabled={uploading}>
                                        {uploading ? 'Processing...' : 'Upload & Provision'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1rem' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                    🔑
                                </div>
                                <h3 style={{ margin: 0 }}>Provisioning Complete</h3>
                                <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)' }}>
                                    Successfully created {credentials.length} new faculty accounts.
                                    Please download the auto-generated passwords now — you will not be able to see them again!
                                </p>
                                <button className="primary-btn" onClick={downloadCredentialsCSV} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    Download Passwords CSV
                                </button>
                                <button className="secondary-btn" onClick={() => { setCredentials(null); setIsUploadModalOpen(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PasswordRevealModal
                isOpen={revealModal.open}
                credentials={revealModal.credentials}
                onClose={() => setRevealModal({ open: false, credentials: null })}
                showCsvDownload={false}
            />
        </div>
    )
}

export default FacultyManagement
