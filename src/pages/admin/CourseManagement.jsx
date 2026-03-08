import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { getCourses, addCourse, updateCourse, deleteCourse } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { RefreshCw, Plus } from 'lucide-react'
import './AdminPanel.css'

const CourseManagement = () => {
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        department: '',
        semester: '1'
    })

    const fetchAllCourses = async () => {
        try {
            setLoading(true)
            const data = await getCourses()
            setCourses(data.courses || [])
        } catch (err) {
            toast.error(err.message || 'Failed to load courses')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllCourses()
    }, [])

    const openCreate = () => {
        setEditingId(null)
        setFormData({ code: '', name: '', department: 'MCA', semester: '1' })
        setIsModalOpen(true)
    }

    const openEdit = (course) => {
        setEditingId(course.id)
        setFormData({
            code: course.code,
            name: course.name,
            department: course.department,
            semester: course.semester?.toString() || '1'
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            if (editingId) {
                await updateCourse(editingId, formData)
                toast.success('Course updated successfully')
            } else {
                await addCourse(formData)
                toast.success('Course created successfully')
            }
            setIsModalOpen(false)
            fetchAllCourses()
        } catch (err) {
            toast.error(err.message || 'Failed to save course')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (course) => {
        confirmToast(`Are you sure you want to delete ${course.code} - ${course.name}?`, async () => {
            try {
                await deleteCourse(course.id)
                toast.success('Course deleted')
                fetchAllCourses()
            } catch (err) {
                toast.error(err.message || 'Failed to delete course')
            }
        })
    }

    const filteredCourses = courses.filter(
        (c) =>
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const columns = [
        { key: 'code', label: 'Course Code', width: '120px' },
        { key: 'name', label: 'Course Name' },
        {
            key: 'department',
            label: 'Department',
            width: '150px',
            render: (c) => <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{c.department}</span>
        },
        { key: 'semester', label: 'Semester', width: '100px' },
    ]

    const actions = [
        {
            label: 'Edit',
            variant: 'secondary',
            onClick: openEdit,
        },
        {
            label: 'Delete',
            variant: 'danger',
            onClick: handleDelete,
        }
    ]

    return (
        <div className="admin-page">
            <section className="page-header">
                <div className="header-content">
                    <h2>Course Management</h2>
                    <p className="header-subtitle">Manage academic subjects, codes, and syllabus details</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="secondary-btn" onClick={fetchAllCourses}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="primary-btn" onClick={openCreate}>
                        <Plus size={16} /> Add Course
                    </button>
                </div>
            </section>

            <section className="page-controls">
                <input
                    type="search"
                    placeholder="Search by course code, name, or department..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="control-stats">
                    Total Courses: <strong>{filteredCourses.length}</strong>
                </div>
            </section>

            <section className="page-content">
                <DataTable
                    columns={columns}
                    data={filteredCourses}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No courses found."
                />
            </section>

            <Modal
                isOpen={isModalOpen}
                title={editingId ? "Edit Course" : "Create New Course"}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Course Code *</label>
                            <input className="form-input" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. CS101" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Course Name *</label>
                            <input className="form-input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Introduction to Programming" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label>
                            <input className="form-input" required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. MCA" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Semester *</label>
                            <input className="form-input" required type="number" min="1" max="10" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Course'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default CourseManagement
