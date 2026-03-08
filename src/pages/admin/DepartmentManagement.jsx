import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { getDepartments, renameDepartment } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { RefreshCw, Users, BookOpen, GraduationCap } from 'lucide-react'
import './AdminPanel.css'

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)

    // Rename Modal State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
    const [renameData, setRenameData] = useState({ oldName: '', newName: '' })
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

    // Prepare table data
    const columns = [
        { key: 'department', label: 'Department Name', width: '250px' },
        {
            key: 'faculty_count',
            label: 'Faculty',
            render: (dep) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="#6b7280" />
                    {dep.faculty_count}
                </div>
            )
        },
        {
            key: 'student_count',
            label: 'Students',
            render: (dep) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GraduationCap size={16} color="#6b7280" />
                    {dep.student_count}
                </div>
            )
        },
        {
            key: 'course_count',
            label: 'Courses',
            render: (dep) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="#6b7280" />
                    {dep.course_count}
                </div>
            )
        }
    ]

    const actions = [
        {
            label: 'Rename',
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
                </div>
            </section>

            <div className="alert alert-info" style={{ marginBottom: '1.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '8px', padding: '12px 16px' }}>
                <strong>Note:</strong> Departments are aggregated dynamically based on user and subject data. Renaming a department affects all associated records globally.
            </div>

            <section className="page-content">
                <DataTable
                    columns={columns}
                    data={departments}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No departments found. Departments are automatically created when you add users or courses."
                />
            </section>

            <Modal
                isOpen={isRenameModalOpen}
                title="Rename Department globally"
                onClose={() => setIsRenameModalOpen(false)}
            >
                <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Current Name</label>
                        <input className="form-input" disabled value={renameData.oldName} style={{ background: '#f1f5f9' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>New Name *</label>
                        <input
                            className="form-input"
                            required
                            autoFocus
                            value={renameData.newName}
                            onChange={e => setRenameData({ ...renameData, newName: e.target.value })}
                            placeholder="e.g. Master of Computer Applications"
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="secondary-btn" onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? 'Renaming...' : 'Rename Global References'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DepartmentManagement
