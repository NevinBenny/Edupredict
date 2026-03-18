import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { getDepartments, renameDepartment, addDepartment } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { RefreshCw, Users, BookOpen, GraduationCap, Pencil, Search } from 'lucide-react'
import './AdminPanel.css'

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Rename Modal State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
    const [renameData, setRenameData] = useState({ oldName: '', newName: '' })
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newDepName, setNewDepName] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchDeps = async () => {
        try {
            setLoading(true)
            const data = await getDepartments()
            setDepartments(data.departments || [])
        } catch (err) {
            toast.error(err.message || 'Failed to load departments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDeps()
    }, [])

    const handleAddSubmit = async (e) => {
        e.preventDefault()
        if (!newDepName.trim()) {
            toast.error('Please enter a department name')
            return
        }

        setSubmitting(true)
        try {
            await addDepartment(newDepName)
            toast.success('Department added successfully')
            setIsAddModalOpen(false)
            setNewDepName('')
            fetchDeps()
        } catch (err) {
            toast.error(err.message || 'Failed to add department')
        } finally {
            setSubmitting(false)
        }
    }

    const openRenameModal = (oldName) => {
        setRenameData({ oldName, newName: oldName })
        setIsRenameModalOpen(true)
    }

    const handleRenameSubmit = async (e) => {
        e.preventDefault()
        if (!renameData.newName || renameData.newName === renameData.oldName) {
            toast.error('Please enter a valid new name')
            return
        }

        confirmToast(`Are you sure you want to rename ${renameData.oldName} to ${renameData.newName}? This will update all associated students, faculty, and courses globally.`, async () => {
            setSubmitting(true)
            try {
                await renameDepartment(renameData.oldName, renameData.newName)
                toast.success('Department renamed successfully')
                setIsRenameModalOpen(false)
                fetchDeps()
            } catch (err) {
                toast.error(err.message || 'Failed to rename department')
            } finally {
                setSubmitting(false)
            }
        })
    }

    const filteredDepartments = departments.filter(d =>
        d.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Prepare table data
    const columns = [
        { key: 'department', label: 'Department Name', width: '250px' },
        {
            key: 'faculty_count',
            label: 'Faculty',
            align: 'center',
            width: '100px',
            render: (count) => (
                <span className="pill-badge pill-info">{count}</span>
            )
        },
        {
            key: 'student_count',
            label: 'Students',
            align: 'center',
            width: '100px',
            render: (count) => (
                <span className="pill-badge pill-success">{count}</span>
            )
        },
        {
            key: 'course_count',
            label: 'Courses',
            align: 'center',
            width: '100px',
            render: (count) => (
                <span className="pill-badge pill-warning">{count}</span>
            )
        }
    ]

    const actions = [
        {
            label: 'Rename',
            icon: <Pencil size={16} />,
            variant: 'secondary',
            onClick: (dep) => openRenameModal(dep.department),
        }
    ]

    return (
        <div className="admin-page">
            <section className="page-header">
                <div className="header-content">
                    <h2>Departments Overview</h2>
                    <p className="header-subtitle">View and logically aggregate university departments</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="secondary-btn" onClick={fetchDeps}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
                        + Add Department
                    </button>
                </div>
            </section>

            <div className="alert alert-info" style={{ marginBottom: '1.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '8px', padding: '12px 16px' }}>
                <strong>Note:</strong> Departments are now managed centrally. You can add new departments or rename existing ones.
            </div>

            <section className="page-controls">
                <div className="search-box">
                    <Search className="search-icon" size={18} />
                    <input
                        type="search"
                        placeholder="Search departments..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="control-stats">
                    Showing <strong>{filteredDepartments.length}</strong> of {departments.length} departments
                </div>
            </section>

            <section className="page-content">
                <DataTable
                    columns={columns}
                    rows={filteredDepartments}
                    actions={actions}
                />
            </section>

            <Modal
                isOpen={isRenameModalOpen}
                title="Rename Department globally"
                onClose={() => setIsRenameModalOpen(false)}
            >
                <form onSubmit={handleRenameSubmit} className="modal-form">
                    <div className="form-field">
                        <label>Current Name</label>
                        <input className="form-input" disabled value={renameData.oldName} />
                    </div>
                    <div className="form-field" style={{ marginTop: '1rem' }}>
                        <label>New Name *</label>
                        <input
                            className="form-input"
                            required
                            autoFocus
                            value={renameData.newName}
                            onChange={e => setRenameData({ ...renameData, newName: e.target.value })}
                            placeholder="e.g. Master of Computer Applications"
                        />
                    </div>
                    <div className="form-footer">
                        <button type="button" className="secondary-btn" onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? 'Renaming...' : 'Rename Global References'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isAddModalOpen}
                title="Add New Department"
                onClose={() => setIsAddModalOpen(false)}
            >
                <form onSubmit={handleAddSubmit} className="modal-form">
                    <div className="form-field">
                        <label>Department Name *</label>
                        <input
                            className="form-input"
                            required
                            autoFocus
                            value={newDepName}
                            onChange={e => setNewDepName(e.target.value)}
                            placeholder="e.g. Data Science"
                        />
                    </div>
                    <div className="form-footer">
                        <button type="button" className="secondary-btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DepartmentManagement
