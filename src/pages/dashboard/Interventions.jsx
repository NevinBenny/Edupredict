import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Clock, AlertCircle, FileText, Download, X } from 'lucide-react'
import './Dashboard.css'

const Interventions = () => {
    const [students, setStudents] = useState([])
    const [interventions, setInterventions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

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
        if (!selectedStudent || !title) return alert("Please select a student and enter a title.")

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
                alert("Intervention assigned successfully!")
                setShowModal(false)
                fetchData()
                // Reset form
                setTitle('')
                setDescription('')
                setDueDate('')
                setSelectedStudent('')
                setFile(null)
            } else {
                alert("Failed to assign intervention.")
            }
        } catch (error) {
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
            if (response.ok) fetchData()
        } catch (error) {
            console.error("Error updating status:", error)
        }
    }

    const highRiskStudents = students.filter(s => s.risk_level === 'High')

    return (
        <div className="dash-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Student Support</p>
                    <h2>Interventions & Assignments</h2>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} /> Assign New Task
                </button>
            </div>

            <div className="dashboard-grid-2col" style={{ alignItems: 'start' }}>
                {/* Left: High Risk Students - Compact List */}
                <div className="card">
                    <div className="card-header">
                        <h3>High Risk Students</h3>
                    </div>
                    <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {highRiskStudents.length > 0 ? (
                            <ul className="alert-list">
                                {highRiskStudents.map(s => (
                                    <li key={s.student_id} className="alert-item" style={{ alignItems: 'center', padding: '10px' }}>
                                        <div className="alert-icon" style={{ color: '#EF4444' }}>
                                            <AlertCircle size={18} />
                                        </div>
                                        <div className="alert-content" style={{ flex: 1 }}>
                                            <p style={{ marginBottom: '2px', fontSize: '13px' }}>{s.name}</p>
                                            <span className="user-role" style={{ fontSize: '11px', color: '#666' }}>
                                                Score: {s.risk_score} • {s.department}
                                            </span>
                                        </div>
                                        <button
                                            className="btn-sm btn-outline"
                                            style={{ fontSize: '11px', padding: '4px 8px' }}
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
                                <CheckCircle size={24} color="#10B981" />
                                <p>No high risk students.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Active Interventions - Detailed Cards */}
                <div className="card">
                    <div className="card-header">
                        <h3>Active Interventions</h3>
                    </div>
                    <div className="card-body">
                        {interventions.length > 0 ? (
                            <div className="intervention-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {interventions.map(int => (
                                    <div key={int.id} className="sensor-card intervention-card">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 className="sensor-name" style={{ fontSize: '14px', marginBottom: '4px' }}>{int.title}</h4>
                                                <span className={`status-badge ${int.status === 'Completed' ? 'active' : 'warn'}`}>
                                                    {int.status}
                                                </span>
                                            </div>
                                            <p className="sensor-status" style={{ fontSize: '12px' }}>
                                                For: <strong>{int.student_name}</strong> • Due: {int.due_date || 'No date'}
                                            </p>
                                            {int.description && (
                                                <p style={{ fontSize: '12px', color: '#555', marginTop: '6px', fontStyle: 'italic' }}>
                                                    "{int.description}"
                                                </p>
                                            )}

                                            {/* Action Row */}
                                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                {int.file_path && (
                                                    <a
                                                        href={`http://localhost:5000/api/uploads/interventions/${int.file_path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="link-btn"
                                                        style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#2563EB', textDecoration: 'none' }}
                                                    >
                                                        <FileText size={14} /> View Document
                                                    </a>
                                                )}
                                                {int.status !== 'Completed' && (
                                                    <button
                                                        className="action-btn"
                                                        style={{ marginLeft: 'auto' }}
                                                        onClick={() => updateStatus(int.id, 'Completed')}
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                                {int.status === 'Completed' && (
                                                    <span style={{ fontSize: '11px', color: '#10B981', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle size={12} /> Done
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <CheckCircle size={48} color="#10B981" style={{ marginBottom: '10px' }} />
                                <p>No active interventions.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
        </div>
    )
}

export default Interventions
