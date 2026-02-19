import { useState, useEffect } from 'react'
import { getFaculties, addFaculty, deleteFaculty } from '../../services/api'
import { UserPlus, Trash2 } from 'lucide-react'
import '../dashboard/Dashboard.css'

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

    return (
        <div className="dash-container minimal">
            <div className="section-header">
                <div>
                    <h3>Faculty Management</h3>
                    <p>View and manage academic staff members</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    <UserPlus size={16} /> Add Faculty
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="card-panel table-card-panel">
                {loading ? (
                    <div className="dash-loading">Loading staff records...</div>
                ) : (
                    <table className="student-table modern">
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
                                            <div className="student-name-cell">
                                                <div className="student-avatar-small">{f.name[0]}</div>
                                                <span className="font-semibold">{f.name}</span>
                                            </div>
                                        </td>
                                        <td>{f.email}</td>
                                        <td>{f.department || 'N/A'}</td>
                                        <td>{f.designation || 'N/A'}</td>
                                        <td>{new Date(f.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn-action-small danger" onClick={() => handleDelete(f.id)} title="Delete Faculty">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state" style={{ textAlign: 'center', padding: '32px', color: 'var(--c-text-tertiary)' }}>No faculty found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-slide-up" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>Add New Faculty</h3>
                        </div>
                        <form onSubmit={handleAddFaculty} className="modal-form">
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
                                />
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
                            <div className="form-group">
                                <label>Temporary Password</label>
                                <input
                                    className="form-input"
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
                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn-secondary-action" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FacultyManagement
