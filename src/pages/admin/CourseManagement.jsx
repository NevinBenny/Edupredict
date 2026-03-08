import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { getCourses, addCourse, updateCourse, deleteCourse, getFaculties } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { RefreshCw, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'
import './AdminPanel.css'

const CourseManagement = () => {
    const [courses, setCourses] = useState([])
    const [faculties, setFaculties] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [deptFilter, setDeptFilter] = useState('')
    const [facultySearch, setFacultySearch] = useState('')

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        department: '',
        semester: '1',
        faculty_ids: []
    })

    const fetchAllData = async () => {
        try {
            setLoading(true)
            const [courseData, facultyData] = await Promise.all([
                getCourses(),
                getFaculties()
            ])
            setCourses(courseData.courses || [])
            setFaculties(facultyData.faculties || [])
        } catch (err) {
            toast.error(err.message || 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllData()
    }, [])

    const openCreate = () => {
        setEditingId(null)
        setFacultySearch('')
        setFormData({ code: '', name: '', department: 'MCA', semester: '1', faculty_ids: [] })
        setIsModalOpen(true)
    }

    const openEdit = (course) => {
        setEditingId(course.id)
        setFacultySearch('')
        setFormData({
            code: course.code,
            name: course.name,
            department: course.department,
            semester: course.semester?.toString() || '1',
            faculty_ids: course.faculty_ids || []
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
            fetchAllData()
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
                fetchAllData()
            } catch (err) {
                toast.error(err.message || 'Failed to delete course')
            }
        })
    }

    const departments = [...new Set(courses.map(c => c.department))].filter(Boolean).sort()

    const filteredCourses = courses.filter(
        (c) => {
            const matchesSearch =
                c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.code?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDept = deptFilter === '' || c.department === deptFilter;

            return matchesSearch && matchesDept;
        }
    )

    const columns = [
        { key: 'code', label: 'Course Code', width: '120px' },
        { key: 'name', label: 'Course Name' },
        { key: 'faculty_names', label: 'Assigned Faculty', render: (names) => <span style={{ fontSize: '0.875rem', color: names === 'Unassigned' ? 'var(--c-text-secondary)' : 'inherit' }}>{names}</span> },
        {
            key: 'department',
            label: 'Department',
            width: '150px',
            render: (dept) => <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{dept}</span>
        },
        { key: 'semester', label: 'Semester', width: '100px' },
    ]

    const actions = [
        {
            label: 'Edit',
            icon: <Pencil size={16} />,
            variant: 'secondary',
            onClick: openEdit,
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
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
                    <button className="secondary-btn" onClick={fetchAllData}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="primary-btn" onClick={openCreate}>
                        <Plus size={16} /> Add Course
                    </button>
                </div>
            </section>

            <section className="page-controls">
                <div className="search-box">
                    <Search className="search-icon" size={18} />
                    <input
                        type="search"
                        placeholder="Search by course code or name..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                    Showing <strong>{filteredCourses.length}</strong> of {courses.length} courses
                </div>
            </section>

            <section className="page-content">
                <DataTable
                    columns={columns}
                    rows={filteredCourses}
                    actions={actions}
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
                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Assign Faculty (Optional)</label>

                            {/* Inner Modal Search */}
                            <div className="search-box" style={{ marginBottom: '0.75rem', minWidth: '100%' }}>
                                <Search className="search-icon" size={14} />
                                <input
                                    className="search-input"
                                    style={{ padding: '6px 12px 6px 32px !important', fontSize: '13px' }}
                                    placeholder="Filter faculty list..."
                                    value={facultySearch}
                                    onChange={(e) => setFacultySearch(e.target.value)}
                                />
                            </div>

                            <div className="form-input" style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {faculties.length === 0 ? (
                                    <span style={{ color: 'var(--c-text-secondary)', fontSize: '0.9rem' }}>No faculty available.</span>
                                ) : (
                                    faculties
                                        .filter(f => !facultySearch || f.name.toLowerCase().includes(facultySearch.toLowerCase()) || f.department?.toLowerCase().includes(facultySearch.toLowerCase()))
                                        .map(faculty => (
                                            <label key={faculty.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.faculty_ids.includes(faculty.id)}
                                                    onChange={(e) => {
                                                        const currentIds = formData.faculty_ids;
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, faculty_ids: [...currentIds, faculty.id] })
                                                        } else {
                                                            setFormData({ ...formData, faculty_ids: currentIds.filter(id => id !== faculty.id) })
                                                        }
                                                    }}
                                                />
                                                {faculty.name} ({faculty.department})
                                            </label>
                                        ))
                                )}
                            </div>
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
