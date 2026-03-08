import { useState, useEffect } from 'react'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import { Upload, Download, RefreshCw, Key } from 'lucide-react'

const StudentManagement = () => {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    // File upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [csvFile, setCsvFile] = useState(null)

    // Single Student state
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
    const [singleStudentData, setSingleStudentData] = useState({
        name: '', email: '', department: 'MCA', semester: '1', sgpa: '', backlogs: 0
    })

    const [uploading, setUploading] = useState(false)
    const [credentials, setCredentials] = useState(null)

    const fetchStudents = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:5000/api/admin/students', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to fetch students')
            setStudents(data.students || [])
            setError(null)
        } catch (err) {
            setError(err.message)
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
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:5000/api/admin/students/batch', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to upload students')

            setCredentials(data.credentials) // List of object {email, password}
            fetchStudents()
            alert(`Successfully processed ${data.credentials?.length} students.`)
        } catch (err) {
            alert(err.message)
        } finally {
            setUploading(false)
        }
    }

    const handleSingleSubmit = async (e) => {
        e.preventDefault()
        setUploading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:5000/api/admin/students/single', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(singleStudentData)
            })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to create student')

            setCredentials([data.credentials])
            fetchStudents()
            setIsSingleModalOpen(false)
            setIsUploadModalOpen(true) // Reuse the success screen
            setSingleStudentData({ name: '', email: '', department: 'MCA', semester: '1', sgpa: '', backlogs: 0 })
        } catch (err) {
            alert(err.message)
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
        if (!confirm(`Are you sure you want to reset the password for ${student.email}?`)) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:5000/api/admin/students/${student.student_id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to reset password')

            alert(`Password has been reset for ${student.name}.\nNew Password: ${data.new_password}`)
        } catch (err) {
            alert(err.message)
        }
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
                    <button className="primary-btn" style={{ background: 'var(--c-primary-light)', color: 'white', border: 'none' }} onClick={() => setIsSingleModalOpen(true)}>
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
        </div>
    )
}

export default StudentManagement
