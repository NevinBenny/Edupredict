import { useState, useEffect } from 'react'
import Modal from '../../components/admin/Modal'
import PasswordRevealModal from '../../components/admin/PasswordRevealModal'
import { getFaculties, addFaculty, deleteFaculty, batchUploadFaculty, resetFacultyPassword } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import './AdminPanel.css'

const FacultyManagement = () => {
    const [faculties, setFaculties] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
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

    const handleAddFaculty = async (e) => {
        e.preventDefault()

        if (!newFaculty.name || !newFaculty.email || !newFaculty.password) {
            toast.error('Name, email, and password are required')
            return
        }

        try {
            await addFaculty(newFaculty)
            toast.success('Faculty added successfully!')
            setNewFaculty({ name: '', email: '', department: '', designation: '' })
            setShowAddModal(false)
            fetchFaculties()
        } catch (err) {
            toast.error(err.message || 'Failed to add faculty')
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

    return (
        <div className="admin-page-container fade-in">
            <div className="page-header">
                <div className="header-text">
                    <h2>Faculty Management</h2>
                    <p>View and manage academic staff members</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="primary-btn" onClick={() => setShowAddModal(true)}>
                        + Add Faculty
                    </button>
                    <button className="primary-btn" onClick={() => setIsUploadModalOpen(true)}>
                        Batch Upload CSV
                    </button>
                </div>
            </div>

            <div className="table-card">
                {loading ? (
                    <div className="loading-state">Loading staff records...</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faculties.length > 0 ? (
                                faculties.map((f) => (
                                    <tr key={f.id}>
                                        <td>
                                            <div className="user-info-cell">
                                                <div className="user-avatar-sm">{f.name[0]}</div>
                                                <span>{f.name}</span>
                                            </div>
                                        </td>
                                        <td>{f.email}</td>
                                        <td>{f.department || 'N/A'}</td>
                                        <td>{f.designation || 'N/A'}</td>
                                        <td>{new Date(f.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn action-btn-secondary"
                                                    onClick={() => handleResetPassword(f)}
                                                    title="Reset Password"
                                                >
                                                    Reset PWD
                                                </button>
                                                <button className="action-btn delete" onClick={() => handleDelete(f.id)} title="Delete">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">No faculty found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Faculty</h3>
                        <form onSubmit={handleAddFaculty}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
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
                                    type="email"
                                    value={newFaculty.email}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                                    placeholder="john@ajce.in"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <select
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
                            <div className="form-group">
                                <label>Designation</label>
                                <input
                                    type="text"
                                    value={newFaculty.designation}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                                    placeholder="Assistant Professor"
                                />
                            </div>
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
                            <div className="modal-actions">
                                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="primary-btn">Create Account</button>
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
