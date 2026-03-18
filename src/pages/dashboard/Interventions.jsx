import { useState, useEffect } from 'react'
import { Plus, X, Search, Filter, Calendar, FileText, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import StudentDetailModal from './StudentDetailModal'
import MetricCard from './MetricCard'
import './Dashboard.css'

const Interventions = () => {
    const [students, setStudents] = useState([])
    const [interventions, setInterventions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [profileStudent, setProfileStudent] = useState(null)
    const [activeTab, setActiveTab] = useState('queue') // queue, students
    const [statusFilter, setStatusFilter] = useState('all') // all, Pending, In Progress, Submitted, Completed

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
    const pendingCount = interventions.filter(i => ['Pending', 'In Progress', 'Submitted'].includes(i.status)).length
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
            <div className="stats-grid single-row" style={{ marginTop: '24px' }}>
                <MetricCard
                    label="Pending Tasks"
                    value={pendingCount}
                    unit="Tasks"
                    icon={<Clock size={20} />}
                    color="#f59e0b"
                    trend="up"
                    trendValue="Active"
                />
                <MetricCard
                    label="Resolved"
                    value={completedCount}
                    unit="Items"
                    icon={<CheckCircle size={20} />}
                    color="#10b981"
                    trend="up"
                    trendValue="Completed"
                />
                <MetricCard
                    label="Priority Students"
                    value={highRiskStudents.length}
                    unit="Alerts"
                    icon={<AlertTriangle size={20} />}
                    color="#ef4444"
                    trend={highRiskStudents.length > 0 ? "down" : "up"}
                    trendValue="High Risk"
                />
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
                            {['all', 'Pending', 'In Progress', 'Submitted', 'Completed'].map(status => (
                                <button
                                    key={status}
                                    className={`btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setStatusFilter(status)}
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
                                    <div key={int.id} className="sensor-card intervention-card" style={{ borderLeft: `4px solid ${int.status?.toLowerCase() === 'completed' ? '#10b981' : (int.status?.toLowerCase() === 'submitted' ? '#3b82f6' : '#f59e0b')}` }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 className="sensor-name" style={{ fontSize: '15px' }}>{int.title}</h4>
                                                <span className={`status-badge ${int.status?.toLowerCase() === 'completed' ? 'active' : (int.status?.toLowerCase() === 'submitted' ? 'info' : 'warn')}`}>
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

                                            <div className="sd-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                                {int.file_path && (
                                                    <a
                                                        href={`http://localhost:5000/api/uploads/interventions/${int.file_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="sd-btn sd-btn-outline"
                                                    >
                                                        <FileText size={14} /> Ref Doc
                                                    </a>
                                                )}

                                                {int.submission_file_path && (
                                                    <a
                                                        href={`http://localhost:5000/api/uploads/interventions/submissions/${int.submission_file_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="sd-btn sd-btn-outline"
                                                        style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                                                    >
                                                        <Download size={14} /> View Student Work
                                                    </a>
                                                )}

                                                {int.submission_file_path && int.status?.toLowerCase() !== 'completed' && (
                                                    <button
                                                        className="sd-btn sd-btn-primary"
                                                        style={{ marginLeft: 'auto', background: '#10b981' }}
                                                        onClick={() => updateStatus(int.id, 'Completed')}
                                                    >
                                                        Approve Submission
                                                    </button>
                                                )}

                                                {['pending', 'in progress'].includes(int.status?.toLowerCase()) && !int.submission_file_path ? (
                                                    <div style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={14} /> Incomplete
                                                    </div>
                                                ) : int.status?.toLowerCase() === 'completed' ? (
                                                    <div style={{ marginLeft: 'auto', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                                                        <CheckCircle size={14} /> Resolved & Approved
                                                    </div>
                                                ) : null}
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
                    <div className="modal-content" style={{ maxWidth: '950px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Assign Task / Material</h3>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Select students on the left and fill in task details on the right
                                </p>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '24px', flex: 1, overflow: 'hidden' }}>

                            {/* Left Side: Student Picker */}
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #f1f5f9', paddingRight: '24px' }}>
                                <div className="modal-picking-header" style={{ marginBottom: '16px' }}>
                                    <div className="search-box" style={{ width: '100%', marginBottom: '12px' }}>
                                        <Search size={14} className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search name or ID..."
                                            value={modalSearch}
                                            onChange={(e) => setModalSearch(e.target.value)}
                                            style={{ paddingLeft: '32px', height: '36px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        {['All', 'High', 'Medium', 'Low'].map(lvl => (
                                            <button
                                                key={lvl}
                                                className={`btn-sm ${modalRiskFilter === lvl ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={() => setModalRiskFilter(lvl)}
                                                style={{ fontSize: '11px', flex: 1 }}
                                            >
                                                {lvl === 'All' ? 'Every Risk' : lvl + ' Risk'}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                            {selectedStudents.length} Selected
                                        </span>
                                        <button
                                            className="btn-ghost"
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                            onClick={toggleAllModal}
                                        >
                                            {selectedStudents.length === modalFilteredStudents.length ? 'Deselect All' : 'Select All Filtered'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                                    {modalFilteredStudents.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {modalFilteredStudents.map(s => (
                                                <label key={s.student_id} className={`picking-item ${selectedStudents.includes(s.student_id) ? 'selected' : ''}`} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: selectedStudents.includes(s.student_id) ? '#f0f7ff' : '#fff',
                                                    border: `1px solid ${selectedStudents.includes(s.student_id) ? '#3b82f6' : '#f1f5f9'}`
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(s.student_id)}
                                                        onChange={() => toggleStudent(s.student_id)}
                                                        style={{ marginRight: '12px', width: '16px', height: '16px' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{s.student_id} • {s.department}</div>
                                                    </div>
                                                    <span className={`risk-badge minimal ${s.risk_level.toLowerCase()}`} style={{ fontSize: '10px' }}>
                                                        {s.risk_level}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="sd-empty" style={{ pointerEvents: 'none' }}>
                                            No students found.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Form Details */}
                            <form onSubmit={handleAssign} className="modal-form" style={{ overflowY: 'auto', paddingRight: '8px' }}>
                                <div className="form-group">
                                    <label>Task Title</label>
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
                                    <label>Detailed Instructions</label>
                                    <textarea
                                        className="form-input"
                                        rows="4"
                                        placeholder="Describe what the students need to do..."
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
                                        <label>Resource / Material (PDF)</label>
                                        <input
                                            type="file"
                                            className="form-input"
                                            accept="application/pdf"
                                            onChange={(e) => setFile(e.target.files[0])}
                                            style={{ padding: '7px' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-actions" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f1f5f9', sticky: 'bottom' }}>
                                    <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={selectedStudents.length === 0}
                                        style={{ background: selectedStudents.length === 0 ? '#94a3b8' : '#3b82f6' }}
                                    >
                                        Assign to {selectedStudents.length} {selectedStudents.length === 1 ? 'Student' : 'Students'}
                                    </button>
                                </div>
                            </form>

                        </div>
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
