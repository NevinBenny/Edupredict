import { useState, useEffect } from 'react'
import { getFaculties, addFaculty, deleteFaculty } from '../../services/api'
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
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // File upload state for Batch CSV
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [csvFile, setCsvFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [credentials, setCredentials] = useState(null)

    useEffect(() => {
        fetchFaculties()
    }, [])

    const fetchFaculties = async () => {
        try {
            setLoading(true)
            const data = await getFaculties()
            setFaculties(data.faculties || [])
        } catch (err) {
            setError('Failed to load faculties')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddFaculty = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!newFaculty.name || !newFaculty.email || !newFaculty.password) {
            setError('Name, email, and password are required')
            return
        }

        try {
            await addFaculty(newFaculty)
            setSuccess('Faculty added successfully!')
            setNewFaculty({ name: '', email: '', department: '', designation: '' })
            setShowAddModal(false)
            fetchFaculties()
        } catch (err) {
            setError(err.message || 'Failed to add faculty')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this faculty member?')) return

        try {
            await deleteFaculty(id)
            setSuccess('Faculty deleted successfully')
            fetchFaculties()
        } catch (err) {
            setError('Failed to delete faculty')
        }
    }

    const handleFileUpload = async (e) => {
        e.preventDefault()
        if (!csvFile) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', csvFile)

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:5000/api/admin/faculties/batch', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to upload faculty')

            setCredentials(data.credentials)
            fetchFaculties()
            setSuccess(`Successfully processed ${data.credentials?.length} faculty accounts.`)
        } catch (err) {
            setError(err.message)
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
                    <button className="primary-btn" style={{ background: 'var(--c-primary-light)', color: 'white', border: 'none' }} onClick={() => setShowAddModal(true)}>
                        + Add Faculty
                    </button>
                    <button className="primary-btn" onClick={() => setIsUploadModalOpen(true)}>
                        Batch Upload CSV
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

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
                                            <button className="action-btn delete" onClick={() => handleDelete(f.id)}>
                                                🗑️
                                            </button>
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
                                <input
                                    type="text"
                                    value={newFaculty.password || ''}
                                    onChange={(e) => setNewFaculty({ ...newFaculty, password: e.target.value })}
                                    placeholder="Enter temporary password"
                                    required
                                    minLength={8}
                                />
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
        </div>
    )
}

export default FacultyManagement
