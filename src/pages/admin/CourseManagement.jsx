import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { getCourses, addCourse, updateCourse, deleteCourse, getFaculties, getDepartments } from '../../services/api'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { RefreshCw, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'
import './AdminPanel.css'

const CourseManagement = () => {
    const [courses, setCourses] = useState([])
    const [faculties, setFaculties] = useState([])
    const [allDepartments, setAllDepartments] = useState([])
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
            const [courseData, facultyData, deptData] = await Promise.all([
                getCourses(),
                getFaculties(),
                getDepartments()
            ])
            setCourses(courseData.courses || [])
            setFaculties(facultyData.faculties || [])
            setAllDepartments(deptData.departments || [])
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
        setFormData({
            code: '',
            name: '',
            department: allDepartments[0]?.department || '',
            semester: '1',
            faculty_ids: []
        })
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
        {
            key: 'name',
            label: 'Course',
            render: (name, row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--c-accent-primary)' }}>{row.code}</span>
                    <span className="sub-detail">{name} • {row.faculty_names || 'Unassigned'}</span>
                </div>
            )
        },
        {
            key: 'department',
            label: 'Department',
            width: '150px',
            render: (dept) => <span className="status-badge status-neutral">{dept}</span>
        },
        {
            key: 'semester',
            label: 'Semester',
            width: '100px',
            align: 'center',
            render: (sem) => <span className="pill-badge pill-info">{sem}</span>
        },
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
                        {allDepartments.map(d => (
                            <option key={d.department} value={d.department}>{d.department}</option>
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
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Course Code *</label>
                            <input
                                className="form-input"
                                required
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. 23INMCA302"
                            />
                        </div>
                        <div className="form-field">
                            <label>Semester *</label>
                            <input
                                className="form-input"
                                type="number"
                                min="1"
                                max="8"
                                required
                                value={formData.semester}
                                onChange={e => setFormData({ ...formData, semester: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-field" style={{ marginTop: '1rem' }}>
                        <label>Course Name *</label>
                        <input
                            className="form-input"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Software Engineering"
                        />
                    </div>

                    <div className="form-field" style={{ marginTop: '1rem' }}>
                        <label>Department *</label>
                        <select
                            className="form-input"
                            required
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                        >
                            <option value="">Select Dept</option>
                            {allDepartments.map(d => (
                                <option key={d.department} value={d.department}>{d.department}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-field" style={{ marginTop: '1.5rem' }}>
                        <label>Assign Faculty Members</label>
                        <div className="faculty-selector">
                            <div className="search-box mini">
                                <Search size={14} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search faculty..."
                                    className="search-input"
                                    value={facultySearch}
                                    onChange={(e) => setFacultySearch(e.target.value)}
                                />
                            </div>

                            {formData.faculty_ids.length > 0 && (
                                <div className="selected-badges">
                                    {formData.faculty_ids.map(id => {
                                        const faculty = faculties.find(f => f.id === id);
                                        return faculty ? (
                                            <span key={id} className="faculty-badge">
                                                {faculty.name}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        faculty_ids: formData.faculty_ids.filter(fid => fid !== id)
                                                    })}
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            <div className="faculty-options-list">
                                {faculties
                                    .filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()))
                                    .slice(0, 5)
                                    .map(f => (
                                        <div
                                            key={f.id}
                                            className={`faculty-option ${formData.faculty_ids.includes(f.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                const exists = formData.faculty_ids.includes(f.id);
                                                if (exists) {
                                                    setFormData({
                                                        ...formData,
                                                        faculty_ids: formData.faculty_ids.filter(id => id !== f.id)
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        faculty_ids: [...formData.faculty_ids, f.id]
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="faculty-info">
                                                <span className="name">{f.name}</span>
                                                <span className="dept">{f.department} • {f.designation}</span>
                                            </div>
                                            {formData.faculty_ids.includes(f.id) && <RefreshCw size={14} className="check-icon" />}
                                        </div>
                                    ))
                                }
                                {faculties.filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase())).length === 0 && (
                                    <div className="no-options">No faculty found</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={submitting}>
                            {submitting ? 'Saving...' : (editingId ? 'Update Course' : 'Add Course')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default CourseManagement
