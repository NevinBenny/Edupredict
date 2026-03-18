import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import PasswordRevealModal from '../../components/admin/PasswordRevealModal'
import { Upload, Download, RefreshCw, Key, CheckSquare, Pencil, Trash2, Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { getStudents, addSingleStudent, updateStudent, deleteStudent, batchUploadStudents, resetStudentPassword as resetApi, getCourses, getDepartments } from '../../services/api'
import './AdminPanel.css'

const StudentManagement = () => {
    const [students, setStudents] = useState([])
    const [courses, setCourses] = useState([])
    const [allDepartments, setAllDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [deptFilter, setDeptFilter] = useState('')
    const [courseSearch, setCourseSearch] = useState('')

    // File upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [csvFile, setCsvFile] = useState(null)

    // Single Student state
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
    const [editingStudentId, setEditingStudentId] = useState(null)
    const [singleStudentData, setSingleStudentData] = useState({
        name: '', email: '', department: '', semester: '1', sgpa: '', backlogs: 0
    })

    const [uploading, setUploading] = useState(false)
    const [credentials, setCredentials] = useState(null)

    // Password reveal modal
    const [revealModal, setRevealModal] = useState({ open: false, credentials: null, list: null })

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }

    const fetchStudents = async () => {
        try {
            setLoading(true)
            const [studentsData, coursesData, deptData] = await Promise.all([
                getStudents(),
                getCourses(),
                getDepartments()
            ])
            setStudents(studentsData.students || [])
            setCourses(coursesData.courses || [])
            setAllDepartments(deptData.departments || [])
            setError(null)
        } catch (err) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    const handleFileUpload = async (e) => {
        e.preventDefault()
        if (!csvFile) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', csvFile)

        try {
            const data = await batchUploadStudents(formData)
            setCredentials(data.credentials) // List of object {email, password}
            fetchStudents()
            toast.success(`Successfully processed ${data.credentials?.length} students.`)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setUploading(false)
        }
    }

    const openCreateModal = () => {
        setEditingStudentId(null)
        setCourseSearch('')
        setSingleStudentData({
            name: '',
            email: '',
            department: allDepartments[0]?.department || '',
            semester: '1',
            sgpa: '',
            backlogs: 0
        })
        setIsSingleModalOpen(true)
    }

    const openEditModal = (student) => {
        setEditingStudentId(student.student_id)
        setCourseSearch('')
        setSingleStudentData({
            name: student.name,
            email: student.email,
            department: student.department,
            semester: student.semester?.toString() || '1',
            sgpa: student.sgpa?.toString() || '',
            backlogs: student.backlogs || 0
        })
        setIsSingleModalOpen(true)
    }

    const handleSingleSubmit = async (e) => {
        e.preventDefault()
        setUploading(true)
        try {
            if (editingStudentId) {
                await updateStudent(editingStudentId, singleStudentData)
                toast.success("Student updated successfully")
                fetchStudents()
                setIsSingleModalOpen(false)
            } else {
                const data = await addSingleStudent(singleStudentData)
                fetchStudents()
                setIsSingleModalOpen(false)
                setSingleStudentData({ name: '', email: '', department: 'MCA', semester: '1', sgpa: '', backlogs: 0 })
                // Show the password reveal modal with CSV option
                setRevealModal({
                    open: true,
                    credentials: data.credentials,
                    list: [data.credentials]
                })
            }
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
        a.download = `student_credentials_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const resetStudentPassword = async (student) => {
        confirmToast(`Reset password for ${student.email}?`, async () => {
            try {
                const data = await resetApi(student.student_id)
                setRevealModal({
                    open: true,
                    credentials: { email: student.email, password: data.new_password },
                    list: [{ email: student.email, password: data.new_password }]
                })
            } catch (err) {
                toast.error(err.message)
            }
        })
    }

    const departments = [...new Set(students.map(s => s.department))].filter(Boolean).sort()

    const filteredStudents = students.filter(
        (s) => {
            const matchesSearch =
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDept = deptFilter === '' || s.department === deptFilter;

            return matchesSearch && matchesDept;
        }
    )

    const columns = [
        {
            key: 'name',
            label: 'Student',
            width: '250px',
            render: (name, row) => (
                <div className="user-info-cell">
                    <div className="user-avatar-sm">{name[0]}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span className="sub-detail">{row.student_id}</span>
                    </div>
                </div>
            )
        },
        { key: 'email', label: 'Email', width: '200px' },
        {
            key: 'department',
            label: 'Dept',
            width: '100px',
            align: 'center',
            render: (dept) => <span className="status-badge status-neutral">{dept}</span>
        },
        {
            key: 'semester',
            label: 'Sem',
            width: '80px',
            align: 'center',
            render: (sem) => <span className="pill-badge pill-info">{sem}</span>
        },
    ]

    const handleDeleteStudent = async (student) => {
        confirmToast(`Are you sure you want to delete ${student.name} (${student.student_id})? This will permanently remove their account and academic records.`, async () => {
            try {
                await deleteStudent(student.student_id)
                toast.success("Student deleted successfully")
                fetchStudents()
            } catch (err) {
                toast.error(err.message)
            }
        })
    }

    const actions = [
        {
            label: 'Edit',
            icon: <Pencil size={16} />,
            variant: 'secondary',
            onClick: openEditModal,
        },
        {
            label: 'Reset Password',
            icon: <Key size={16} />,
            variant: 'secondary',
            onClick: resetStudentPassword,
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            variant: 'danger',
            onClick: handleDeleteStudent,
        }
    ]

    return (
        <div className="admin-page">
            <section className="page-header">
                <div className="header-content">
                    <h2>Student Management</h2>
                    <p className="header-subtitle">Batch provision and manage student accounts</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="secondary-btn" onClick={fetchStudents}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button className="primary-btn" onClick={openCreateModal}>
                        + Add Single Student
                    </button>
                    <button className="primary-btn" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload size={16} /> Batch Upload CSV
                    </button>
                </div>
            </section>

            {error && <div className="alert alert-error">{error}</div>}

            <section className="page-controls">
                <div className="search-box">
                    <Search className="search-icon" size={18} />
                    <input
                        type="search"
                        placeholder="Search by name, ID, or email..."
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
                        {allDepartments.map(d => (
                            <option key={d.department} value={d.department}>{d.department}</option>
                        ))}
                    </select>
                </div>

                <div className="control-stats">
                    Showing <strong>{filteredStudents.length}</strong> of {students.length} students
                </div>
            </section>

            <section className="page-content">
                {loading ? (
                    <p>Loading mapping data...</p>
                ) : (
                    <DataTable columns={columns} rows={filteredStudents} actions={actions} />
                )}
            </section>

            <Modal
                isOpen={isUploadModalOpen}
                title="Batch Provision Students"
                onClose={() => setIsUploadModalOpen(false)}
            >
                {!credentials ? (
                    <form onSubmit={handleFileUpload} className="modal-form">
                        <div className="form-field">
                            <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                Upload a CSV file with columns: <b>name, department, semester, email, sgpa, backlogs</b>.
                                The backend will automatically create secure random passwords for each new student.
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                className="form-input"
                                style={{ padding: '8px' }}
                                required
                                onChange={e => setCsvFile(e.target.files[0])}
                            />
                        </div>
                        <div className="form-footer">
                            <button type="button" className="secondary-btn" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                            <button type="submit" className="primary-btn" disabled={uploading}>
                                {uploading ? 'Processing...' : (
                                    <><Upload size={16} /> Upload & Provision</>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1rem' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Key size={32} color="#22c55e" />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 800 }}>Provisioning Complete</h3>
                        <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)' }}>
                            Successfully created {credentials.length} new student accounts.
                            Please download the auto-generated passwords now — you will not be able to see them again!
                        </p>
                        <button className="primary-btn" onClick={downloadCredentialsCSV} style={{ width: '100%', justifyContent: 'center' }}>
                            <Download size={18} /> Download Passwords CSV
                        </button>
                        <button className="secondary-btn" onClick={() => { setCredentials(null); setIsUploadModalOpen(false); setIsSingleModalOpen(false); }} style={{ width: '100%', justifyContent: 'center' }}>
                            Done
                        </button>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isSingleModalOpen}
                title={editingStudentId ? `Edit Student: ${editingStudentId}` : "Add Single Student"}
                onClose={() => setIsSingleModalOpen(false)}
            >
                <form onSubmit={handleSingleSubmit} className="modal-form">
                    <div className="form-field">
                        <label>Full Name *</label>
                        <input className="form-input" required value={singleStudentData.name} onChange={e => setSingleStudentData({ ...singleStudentData, name: e.target.value })} placeholder="e.g. Rahul Kumar" />
                    </div>
                    <div className="form-field">
                        <label>Email Address *</label>
                        <input className="form-input" type="email" required disabled={!!editingStudentId} value={singleStudentData.email} onChange={e => setSingleStudentData({ ...singleStudentData, email: e.target.value })} placeholder="student@ajce.edu.in" />
                        {editingStudentId && <small className="text-muted">Email cannot be changed after creation.</small>}
                    </div>
                    <div className="form-grid">
                        <div className="form-field">
                            <label>Department *</label>
                            <select
                                className="form-input"
                                required
                                value={singleStudentData.department}
                                onChange={e => setSingleStudentData({ ...singleStudentData, department: e.target.value })}
                            >
                                <option value="">Select Dept</option>
                                {allDepartments.map(d => (
                                    <option key={d.department} value={d.department}>{d.department}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Semester *</label>
                            <input className="form-input" required type="number" min="1" max="8" value={singleStudentData.semester} onChange={e => setSingleStudentData({ ...singleStudentData, semester: e.target.value })} />
                        </div>
                        <div className="form-field">
                            <label>Previous SGPA</label>
                            <input className="form-input" type="number" step="0.01" min="0" max="10" value={singleStudentData.sgpa} onChange={e => setSingleStudentData({ ...singleStudentData, sgpa: e.target.value })} placeholder="e.g. 7.5" />
                        </div>
                        <div className="form-field">
                            <label>Active Backlogs</label>
                            <input className="form-input" type="number" min="0" value={singleStudentData.backlogs} onChange={e => setSingleStudentData({ ...singleStudentData, backlogs: e.target.value })} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-footer">
                        <button type="button" className="secondary-btn" onClick={() => setIsSingleModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={uploading}>
                            {uploading ? 'Processing...' : (editingStudentId ? 'Update Student' : 'Create Student')}
                        </button>
                    </div>
                </form>
            </Modal>

            <PasswordRevealModal
                isOpen={revealModal.open}
                credentials={revealModal.credentials}
                credentialsList={revealModal.list}
                onClose={() => setRevealModal({ open: false, credentials: null, list: null })}
                showCsvDownload={true}
                csvFilename={`student_credentials_${new Date().toISOString().split('T')[0]}.csv`}
            />
        </div>
    )
}

export default StudentManagement
