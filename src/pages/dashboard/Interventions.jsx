import { useState, useEffect } from 'react'
import { Plus, X, Search, Filter, Calendar, FileText, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import StudentDetailModal from './StudentDetailModal'
import './Dashboard.css'

const Interventions = () => {
    const [students, setStudents] = useState([])
    const [interventions, setInterventions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [profileStudent, setProfileStudent] = useState(null)
    const [activeTab, setActiveTab] = useState('queue') // queue, students
    const [statusFilter, setStatusFilter] = useState('all') // all, Pending, Completed

    // Form State
    const [selectedStudents, setSelectedStudents] = useState([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [file, setFile] = useState(null)
    const [modalSearch, setModalSearch] = useState('')
    const [modalRiskFilter, setModalRiskFilter] = useState('All')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const studentRes = await fetch('http://localhost:5000/api/students', { credentials: 'include' })
            const studentData = await studentRes.json()
            if (studentData.students) setStudents(studentData.students)

            const intRes = await fetch('http://localhost:5000/api/interventions', { credentials: 'include' })
            const intData = await intRes.json()
            if (intData.interventions) setInterventions(intData.interventions)

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async (e) => {
        e.preventDefault()
        if (selectedStudents.length === 0 || !title) return toast.error("Please select at least one student and a title.")

        const formData = new FormData()
        formData.append('student_id', selectedStudents.join(','))
        formData.append('title', title)
        formData.append('description', description)
        formData.append('due_date', dueDate)
        if (file) {
            formData.append('file', file)
        }

        try {
            const response = await fetch('http://localhost:5000/api/interventions', {
                method: 'POST',
                body: formData, // No Content-Type header needed, browser sets it
                credentials: 'include'
            })

            if (response.ok) {
                toast.success("Intervention assigned successfully!")
                setShowModal(false)
                fetchData()
                // Reset form
                setTitle('')
                setDescription('')
                setDueDate('')
                setSelectedStudents([])
                setFile(null)
                setModalSearch('')
                setModalRiskFilter('All')
            } else {
                toast.error("Failed to assign intervention.")
            }
        } catch (error) {
            toast.error("Error creating intervention.")
            console.error("Error creating intervention:", error)
        }
    }

    const updateStatus = async (id, newStatus) => {
        try {
            const response = await fetch(`http://localhost:5000/api/interventions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            })
            if (response.ok) {
                toast.success(`Status updated to ${newStatus}`)
                fetchData()
            }
        } catch (error) {
            console.error("Error updating status:", error)
        }
    }

    const highRiskStudents = students.filter(s => s.risk_level === 'High')
    const pendingCount = interventions.filter(i => i.status === 'Pending').length
    const completedCount = interventions.filter(i => i.status === 'Completed').length

    const filteredInterventions = interventions.filter(i => {
        if (statusFilter === 'all') return true
        return i.status === statusFilter
    })

    const modalFilteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
            s.student_id.toLowerCase().includes(modalSearch.toLowerCase());
        const matchesRisk = modalRiskFilter === 'All' || s.risk_level === modalRiskFilter;
        return matchesSearch && matchesRisk;
    })

    const toggleStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        )
    }

    const toggleAllModal = () => {
        if (selectedStudents.length === modalFilteredStudents.length) {
            setSelectedStudents([])
        } else {
            setSelectedStudents(modalFilteredStudents.map(s => s.student_id))
        }
    }

    return (
        <div className="dash-container">
            <div className="section-header">
                <div>
                    <h3>Interventions & Assignments</h3>
                    <p>Manage student support and remedial tasks</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Assign New Task
                </button>
            </div>

            <div className="dashboard-grid-2col" style={{ alignItems: 'start' }}>
                {/* Left: High Risk Students - Compact List */}
                <div className="card-panel">
                    <div className="section-header" style={{ marginBottom: '16px' }}>
                        <h3>High Risk Students</h3>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                        {highRiskStudents.length > 0 ? (
                            <ul className="alert-list">
                                {highRiskStudents.map(s => (
                                    <li key={s.student_id} className="alert-item">
                                        <div className="alert-icon" style={{ color: 'var(--c-status-danger)' }}>
                                            <AlertCircle size={20} />
                                        </div>
                                        <div className="alert-content" style={{ flex: 1 }}>
                                            <p>{s.name}</p>
                                            <span className="text-sm">
                                                Risk Score: <strong>{s.risk_score}</strong> • {s.department}
                                            </span>
                                        </div>
                                        <button
                                            className="btn-sm btn-outline"
                                            onClick={() => {
                                                setSelectedStudent(s.student_id)
                                                setShowModal(true)
                                            }}
                                        >
                                            Assign
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="empty-state-small">
                                <CheckCircle size={24} color="var(--c-status-safe)" />
                                <p>No high risk students found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="page-tabs" style={{ marginTop: '32px' }}>
                <button
                    className={`page-tab ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    Intervention Queue
                </button>
                <button
                    className={`page-tab ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    Recommended (High Risk)
                </button>
            </div>

                {/* Right: Active Interventions - Detailed Cards */}
                <div className="card-panel">
                    <div className="section-header" style={{ marginBottom: '16px' }}>
                        <h3>Active Interventions</h3>
                    </div>
                    <div>
                        {interventions.length > 0 ? (
                            <div className="intervention-list">
                                {interventions.map(int => (
                                    <div key={int.id} className="intervention-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{int.title}</h4>
                                            <span className={`status-badge ${int.status === 'Completed' ? 'active' : 'warn'}`}>
                                                {int.status}
                                            </span>
                                        </div>

                                        <p className="text-sm" style={{ marginBottom: '8px' }}>
                                            Student: <strong>{int.student_name}</strong> • Due: {int.due_date || 'No date'}
                                        </p>

                                        {int.description && (
                                            <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', fontStyle: 'italic', marginBottom: '12px', background: 'var(--c-surface-muted)', padding: '8px', borderRadius: '4px' }}>
                                                "{int.description}"
                                            </p>
                                        )}

                                        {/* Action Row */}
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                                            {int.file_path && (
                                                <a
                                                    href={`http://localhost:5000/api/uploads/interventions/${int.file_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="link-btn"
                                                    style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <FileText size={14} /> View Attachment
                                                </a>
                                            )}

                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                                {int.status !== 'Completed' ? (
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => updateStatus(int.id, 'Completed')}
                                                    >
                                                        Mark Done
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: 'var(--c-status-safe)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                        <CheckCircle size={14} /> Completed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state-small" style={{ background: 'transparent' }}>
                                <Clock size={32} color="var(--c-text-tertiary)" />
                                <p>No active interventions or assignments.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card">
                    <div className="card-header">
                        <h3>Recommended Interventions</h3>
                        <p className="eyebrow">Students requiring immediate attention based on AI risk analysis</p>
                    </div>
                    <div className="card-body">
                        {highRiskStudents.length > 0 ? (
                            <div className="sensor-list">
                                {highRiskStudents.map(s => (
                                    <div key={s.student_id} className="sensor-card" style={{ borderLeft: '4px solid #ef4444' }}>
                                        <div className="sensor-info" style={{ flex: 1 }}>
                                            <span className="sensor-name">{s.name}</span>
                                            <span className="sensor-status">Risk Index: {s.risk_score} • {s.department}</span>
                                        </div>
                                        <button
                                            className="btn-sm btn-outline"
                                            onClick={() => setProfileStudent(s)}
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '64px 0' }}>
                                <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px' }} />
                                <p>Fantastic! No students currently fall into the high-risk category.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Assign New Task / Intervention</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssign} className="modal-form">
                            <div className="form-group">
                                <label>Select Student <span style={{ color: 'red' }}>*</span></label>
                                <div className="select-wrapper">
                                    <select
                                        className="form-input"
                                        value={selectedStudent}
                                        onChange={(e) => setSelectedStudent(e.target.value)}
                                        required
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">-- Choose Student --</option>
                                        {highRiskStudents.length > 0 && <optgroup label="High Risk Students">
                                            {highRiskStudents.map(s => (
                                                <option key={s.student_id} value={s.student_id}>
                                                    {s.name} (Risk: {s.risk_score})
                                                </option>
                                            ))}
                                        </optgroup>}
                                        <optgroup label="Other Students">
                                            {students.filter(s => s.risk_level !== 'High').map(s => (
                                                <option key={s.student_id} value={s.student_id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Task Title <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Remedial Assignment 1"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Instructions for the student..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                ></textarea>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Due Date</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Remedial Reading Assignment"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Attach PDF (Optional)</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        accept="application/pdf"
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                </div>

                            <div className="form-actions">
                                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Assign Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {profileStudent && (
                <StudentDetailModal
                    student={profileStudent}
                    onClose={() => setProfileStudent(null)}
                />
            )}
        </div>
    )
}

export default Interventions
