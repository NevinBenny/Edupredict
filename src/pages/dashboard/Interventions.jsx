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
    const [selectedStudent, setSelectedStudent] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [file, setFile] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const studentRes = await fetch('http://localhost:5000/api/students')
            const studentData = await studentRes.json()
            if (studentData.students) setStudents(studentData.students)

            const intRes = await fetch('http://localhost:5000/api/interventions')
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
        if (!selectedStudent || !title) return toast.error("Please select a student and enter a title.")

        const formData = new FormData()
        formData.append('student_id', selectedStudent)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('due_date', dueDate)
        if (file) {
            formData.append('file', file)
        }

        try {
            const response = await fetch('http://localhost:5000/api/interventions', {
                method: 'POST',
                body: formData // No Content-Type header needed, browser sets it
            })

            if (response.ok) {
                toast.success("Intervention assigned successfully!")
                setShowModal(false)
                fetchData()
                // Reset form
                setTitle('')
                setDescription('')
                setDueDate('')
                setSelectedStudent('')
                setFile(null)
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
                body: JSON.stringify({ status: newStatus })
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

    return (
        <div className="dash-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Student Support</p>
                    <h2>Interventions & Assignments</h2>
                </div>
                <button className="btn-action" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Assign New Task
                </button>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid single-row">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}><Clock size={20} /></div>
                    <div className="stat-info">
                        <h3>{pendingCount}</h3>
                        <p>Pending Tasks</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f0fdf4', color: '#15803d' }}><CheckCircle size={20} /></div>
                    <div className="stat-info">
                        <h3>{completedCount}</h3>
                        <p>Resolved</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef2f2', color: '#b91c1c' }}><AlertTriangle size={20} /></div>
                    <div className="stat-info">
                        <h3>{highRiskStudents.length}</h3>
                        <p>Priority Students</p>
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

            {activeTab === 'queue' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Queue Filters</h3>
                        <div className="action-group">
                            {['all', 'Pending', 'Completed'].map(status => (
                                <button
                                    key={status}
                                    className={`btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setStatusFilter(status)}
                                    style={{ fontSize: '11px', textTransform: 'capitalize' }}
                                >
                                    {status === 'all' ? 'All Tasks' : status}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="card-body">
                        {filteredInterventions.length > 0 ? (
                            <div className="intervention-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                                {filteredInterventions.map(int => (
                                    <div key={int.id} className="sensor-card intervention-card" style={{ borderLeft: `4px solid ${int.status === 'Completed' ? '#10b981' : '#f59e0b'}` }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 className="sensor-name" style={{ fontSize: '15px' }}>{int.title}</h4>
                                                <span className={`status-badge ${int.status === 'Completed' ? 'active' : 'warn'}`}>
                                                    {int.status}
                                                </span>
                                            </div>
                                            <p className="sensor-status" style={{ margin: '8px 0' }}>
                                                For: <strong>{int.student_name}</strong>
                                            </p>
                                            <div className="sd-meta" style={{ marginBottom: '12px' }}>
                                                <Calendar size={13} /> {int.due_date ? new Date(int.due_date).toLocaleDateString() : 'No Deadline'}
                                            </div>

                                            {int.description && (
                                                <p style={{ fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #e2e8f0', marginBottom: '16px' }}>
                                                    {int.description}
                                                </p>
                                            )}

                                            <div className="sd-actions" style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                                {int.file_path && (
                                                    <a
                                                        href={`http://localhost:5000/api/uploads/interventions/${int.file_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="sd-btn sd-btn-outline"
                                                        style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
                                                    >
                                                        <FileText size={14} /> View Doc
                                                    </a>
                                                )}
                                                {int.status !== 'Completed' ? (
                                                    <button
                                                        className="sd-btn sd-btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '12px', marginLeft: 'auto' }}
                                                        onClick={() => updateStatus(int.id, 'Completed')}
                                                    >
                                                        Mark Done
                                                    </button>
                                                ) : (
                                                    <div style={{ marginLeft: 'auto', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                                                        <CheckCircle size={14} /> Resolved
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '64px 0' }}>
                                <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px' }} />
                                <p>No tasks found matching your filter.</p>
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
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Assign New Task</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssign} className="modal-form">
                            <div className="form-group">
                                <label>Select Student</label>
                                <select
                                    className="form-input"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose Student --</option>
                                    {highRiskStudents.map(s => (
                                        <option key={s.student_id} value={s.student_id}>
                                            {s.name} (Risk: {s.risk_score})
                                        </option>
                                    ))}
                                    <option disabled>--- Other Students ---</option>
                                    {students.filter(s => s.risk_level !== 'High').map(s => (
                                        <option key={s.student_id} value={s.student_id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Task Title</label>
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
                                    rows="2"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Attach PDF (Question Paper)</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        accept="application/pdf"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        style={{ padding: '7px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
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
