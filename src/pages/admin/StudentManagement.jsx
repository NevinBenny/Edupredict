import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import PasswordRevealModal from '../../components/admin/PasswordRevealModal'
import { Upload, Download, RefreshCw, Key, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmToast } from '../../utils/confirmToast'
import { getStudents, addSingleStudent, batchUploadStudents, resetStudentPassword as resetApi, getCourses } from '../../services/api'
import './AdminPanel.css'

const StudentManagement = () => {
    const [students, setStudents] = useState([])
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    // File upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [csvFile, setCsvFile] = useState(null)

    // Single Student state
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
    const [singleStudentData, setSingleStudentData] = useState({
        name: '', email: '', department: 'MCA', semester: '1', sgpa: '', backlogs: 0, subject_ids: []
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
            const [studentsData, coursesData] = await Promise.all([
                getStudents(),
                getCourses()
            ])
            setStudents(studentsData.students || [])
            setCourses(coursesData.courses || [])
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

    const handleSingleSubmit = async (e) => {
        e.preventDefault()
        if (singleStudentData.subject_ids.length === 0) {
            toast.error("Please select at least one course.")
            return
        }
        setUploading(true)
        try {
            const data = await addSingleStudent(singleStudentData)
            fetchStudents()
            setIsSingleModalOpen(false)
            setSingleStudentData({ name: '', email: '', department: 'MCA', semester: '1', sgpa: '', backlogs: 0, subject_ids: [] })
            // Show the password reveal modal with CSV option
            setRevealModal({
                open: true,
                credentials: data.credentials,
                list: [data.credentials]
            })
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

    const filteredStudents = students.filter(
        (s) =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const columns = [
        { key: 'student_id', label: 'ID', width: '120px' },
        { key: 'name', label: 'Name', width: '200px' },
        { key: 'email', label: 'Email', width: '200px' },
        { key: 'department', label: 'Department', width: '100px' },
        { key: 'semester', label: 'Semester', width: '100px' },
    ]

    const actions = [
        {
            label: 'Reset Password',
            variant: 'secondary',
            onClick: resetStudentPassword,
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
                    <button className="primary-btn" onClick={() => setIsSingleModalOpen(true)}>
                        + Add Single Student
                    </button>
                    <button className="primary-btn" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload size={16} /> Batch Upload CSV
                    </button>
                </div>
            </section>

            {error && <div className="alert alert-error">{error}</div>}

            <section className="page-controls">
                <input
                    type="search"
                    placeholder="Search by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="control-stats">
                    Showing {filteredStudents.length} of {students.length} students
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
                    <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <p style={{ color: 'var(--c-text-secondary)' }}>
                            Upload a CSV file with columns: <b>name, department, semester, email, sgpa, backlogs</b>.
                            The backend will automatically create secure random passwords for each new student.
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
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Key size={32} color="#22c55e" />
                        </div>
                        <h3 style={{ margin: 0 }}>Provisioning Complete</h3>
                        <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)' }}>
                            Successfully created {credentials.length} new student accounts.
                            Please download the auto-generated passwords now — you will not be able to see them again!
                        </p>
                        <button className="primary-btn" onClick={downloadCredentialsCSV} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Download size={18} /> Download Passwords CSV
                        </button>
                        <button className="secondary-btn" onClick={() => { setCredentials(null); setIsUploadModalOpen(false); setIsSingleModalOpen(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            Done
                        </button>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isSingleModalOpen}
                title="Add Single Student"
                onClose={() => setIsSingleModalOpen(false)}
            >
                <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
                        <input className="form-input" required value={singleStudentData.name} onChange={e => setSingleStudentData({ ...singleStudentData, name: e.target.value })} placeholder="e.g. Rahul Kumar" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address *</label>
                        <input className="form-input" type="email" required value={singleStudentData.email} onChange={e => setSingleStudentData({ ...singleStudentData, email: e.target.value })} placeholder="student@ajce.edu.in" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Department *</label>
                            <input className="form-input" required value={singleStudentData.department} onChange={e => setSingleStudentData({ ...singleStudentData, department: e.target.value })} placeholder="MCA" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Semester *</label>
                            <input className="form-input" required type="number" min="1" max="8" value={singleStudentData.semester} onChange={e => setSingleStudentData({ ...singleStudentData, semester: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Assign Courses *</label>
                            <div className="form-input" style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {courses.length === 0 ? (
                                    <span style={{ color: 'var(--c-text-secondary)', fontSize: '0.9rem' }}>No courses available. Please add courses first.</span>
                                ) : (
                                    courses.map(course => (
                                        <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={singleStudentData.subject_ids.includes(course.id)}
                                                onChange={(e) => {
                                                    const currentIds = singleStudentData.subject_ids;
                                                    if (e.target.checked) {
                                                        setSingleStudentData({ ...singleStudentData, subject_ids: [...currentIds, course.id] })
                                                    } else {
                                                        setSingleStudentData({ ...singleStudentData, subject_ids: currentIds.filter(id => id !== course.id) })
                                                    }
                                                }}
                                            />
                                            {course.name} ({course.course_code}) - Sem {course.semester}
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Previous SGPA</label>
                            <input className="form-input" type="number" step="0.01" min="0" max="10" value={singleStudentData.sgpa} onChange={e => setSingleStudentData({ ...singleStudentData, sgpa: e.target.value })} placeholder="e.g. 7.5" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Active Backlogs</label>
                            <input className="form-input" type="number" min="0" value={singleStudentData.backlogs} onChange={e => setSingleStudentData({ ...singleStudentData, backlogs: e.target.value })} placeholder="0" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="secondary-btn" onClick={() => setIsSingleModalOpen(false)}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={uploading}>
                            {uploading ? 'Processing...' : 'Create Student'}
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
