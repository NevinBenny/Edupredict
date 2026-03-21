import { useState, useEffect } from 'react'
import { Users, BookOpen, UserCheck, Plus, Trash2, X, ChevronRight, UserPlus, GraduationCap } from 'lucide-react'
import '../dashboard/Dashboard.css'

const API = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}`

const ClassManagement = () => {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [unassignedFaculties, setUnassignedFaculties] = useState([])
  const [unassignedStudents, setUnassignedStudents] = useState([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignFacultyModal, setShowAssignFacultyModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showAssignExistingModal, setShowAssignExistingModal] = useState(false)

  // Form states
  const [newClass, setNewClass] = useState({ name: '', department: '', semester: '' })
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [newStudent, setNewStudent] = useState({
    student_id: '', name: '', department: '', semester: '',
    attendance_percentage: '', sgpa: '', backlogs: '',
    internal_marks: '', assignment_score: ''
  })

  useEffect(() => { fetchClasses() }, [])

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API}/api/admin/classes`, { credentials: 'include' })
      const data = await res.json()
      setClasses(data.classes || [])
    } catch (e) { console.error(e) }
  }

  const fetchClassStudents = async (classId) => {
    try {
      const res = await fetch(`${API}/api/admin/classes/${classId}/students`, { credentials: 'include' })
      const data = await res.json()
      setClassStudents(data.students || [])
    } catch (e) { console.error(e) }
  }

  const fetchUnassignedFaculties = async () => {
    try {
      const res = await fetch(`${API}/api/admin/faculties/unassigned`, { credentials: 'include' })
      const data = await res.json()
      setUnassignedFaculties(data.faculties || [])
    } catch (e) { console.error(e) }
  }

  const fetchUnassignedStudents = async (department = '', semester = '') => {
    try {
      const params = new URLSearchParams()
      if (department) params.append('department', department)
      if (semester) params.append('semester', semester)
      const res = await fetch(`${API}/api/admin/students/unassigned?${params}`, { credentials: 'include' })
      const data = await res.json()
      setUnassignedStudents(data.students || [])
    } catch (e) { console.error(e) }
  }

  const selectClass = (cls) => {
    setSelectedClass(cls)
    fetchClassStudents(cls.id)
  }

  // ── Create Class ──────────────────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault()
    if (!newClass.name.trim()) return alert('Class name is required')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newClass)
      })
      const data = await res.json()
      if (!res.ok) return alert(data.error || 'Failed to create class')
      setShowCreateModal(false)
      setNewClass({ name: '', department: '', semester: '' })
      fetchClasses()
    } catch (e) { alert('Network error') }
    finally { setLoading(false) }
  }

  // ── Delete Class ──────────────────────────────────────────────────────────
  const handleDeleteClass = async (classId) => {
    if (!confirm('Delete this class? Students will be unassigned.')) return
    try {
      await fetch(`${API}/api/admin/classes/${classId}`, {
        method: 'DELETE', credentials: 'include'
      })
      if (selectedClass?.id === classId) setSelectedClass(null)
      fetchClasses()
    } catch (e) { alert('Failed to delete class') }
  }

  // ── Assign Faculty ────────────────────────────────────────────────────────
  const handleAssignFaculty = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/classes/${selectedClass.id}/assign-faculty`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ faculty_id: selectedFacultyId || null })
      })
      if (!res.ok) { const d = await res.json(); return alert(d.error) }
      setShowAssignFacultyModal(false)
      setSelectedFacultyId('')
      fetchClasses()
    } catch (e) { alert('Network error') }
    finally { setLoading(false) }
  }

  // ── Add New Student ───────────────────────────────────────────────────────
  const handleAddStudent = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/classes/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newStudent)
      })
      const data = await res.json()
      if (!res.ok) return alert(data.error || 'Failed to add student')
      setShowAddStudentModal(false)
      setNewStudent({ student_id: '', name: '', department: '', semester: '', attendance_percentage: '', sgpa: '', backlogs: '', internal_marks: '', assignment_score: '' })
      fetchClassStudents(selectedClass.id)
      fetchClasses()
    } catch (e) { alert('Network error') }
    finally { setLoading(false) }
  }

  // ── Assign Existing Students ──────────────────────────────────────────────
  const handleAssignExisting = async (e) => {
    e.preventDefault()
    if (!selectedStudentIds.length) return alert('Select at least one student')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/classes/${selectedClass.id}/assign-students`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ student_ids: selectedStudentIds })
      })
      if (!res.ok) { const d = await res.json(); return alert(d.error) }
      setShowAssignExistingModal(false)
      setSelectedStudentIds([])
      fetchClassStudents(selectedClass.id)
      fetchClasses()
    } catch (e) { alert('Network error') }
    finally { setLoading(false) }
  }

  const toggleStudentSelect = (sid) => {
    setSelectedStudentIds(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === unassignedStudents.length && unassignedStudents.length > 0) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(unassignedStudents.map(s => s.student_id))
    }
  }

  const allSelected = unassignedStudents.length > 0 && selectedStudentIds.length === unassignedStudents.length

  const riskColor = (level) =>
    level === 'High' ? 'high' : level === 'Medium' ? 'medium' : 'low'

  return (
    <div className="dash-container minimal">
      <div className="section-header">
        <div>
          <h3>Class Management</h3>
          <p>Organize classes, assign faculty, and manage students</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> New Class
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Left: Class List ── */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} /> <span style={{ fontWeight: 600 }}>Classes ({classes.length})</span>
          </div>
          <div style={{ padding: 0 }}>
            {classes.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <BookOpen size={36} color="#9CA3AF" />
                <p style={{ marginTop: 8 }}>No classes yet. Create one!</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {classes.map(cls => (
                  <li
                    key={cls.id}
                    onClick={() => selectClass(cls)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--c-border-subtle)',
                      cursor: 'pointer',
                      background: selectedClass?.id === cls.id ? 'var(--c-surface-muted)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: 'var(--c-accent-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, flexShrink: 0
                    }}>
                      {cls.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: 'var(--c-text-primary)' }}>{cls.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>
                        {cls.department || '—'} · Sem {cls.semester || '—'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--c-text-tertiary)', margin: '2px 0 0' }}>
                        {cls.faculty_name ? `👤 ${cls.faculty_name}` : '⚠️ No faculty'} · {cls.student_count} students
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn-action-small danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id) }}
                        title="Delete class"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={16} color="var(--c-text-tertiary)" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right: Class Detail ── */}
        {selectedClass ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Class Info Header */}
            <div className="card-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20 }}>{selectedClass.name}</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--c-text-secondary)', fontSize: 13 }}>
                    {selectedClass.department} · Semester {selectedClass.semester}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {selectedClass.faculty_name
                      ? <span style={{ color: 'var(--c-status-safe)' }}>👤 {selectedClass.faculty_name} ({selectedClass.faculty_email})</span>
                      : <span style={{ color: 'var(--c-status-danger)' }}>⚠️ No faculty assigned</span>
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary-action" onClick={() => { fetchUnassignedFaculties(); setShowAssignFacultyModal(true) }}>
                    <UserCheck size={15} style={{ marginRight: 5 }} /> Assign Faculty
                  </button>
                  <button className="btn-secondary-action" onClick={() => {
                    setNewStudent(s => ({ ...s, department: selectedClass.department || '', semester: selectedClass.semester || '' }))
                    setShowAddStudentModal(true)
                  }}>
                    <UserPlus size={15} style={{ marginRight: 5 }} /> Add Student
                  </button>
                  <button className="btn-primary" onClick={() => { fetchUnassignedStudents(selectedClass.department, selectedClass.semester); setShowAssignExistingModal(true) }}>
                    <Users size={15} style={{ marginRight: 5 }} /> Assign Existing
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="card-panel table-card-panel">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border-subtle)' }}>
                <h3 style={{ fontSize: '15px' }}><GraduationCap size={16} style={{ marginRight: 6 }} />Students ({classStudents.length})</h3>
              </div>
              <div>
                {classStudents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                    <Users size={36} color="#9CA3AF" />
                    <p style={{ marginTop: 8 }}>No students in this class yet.</p>
                  </div>
                ) : (
                  <table className="student-table modern">
                    <thead>
                      <tr>
                        {['ID', 'Name', 'Dept', 'Sem', 'Attendance', 'SGPA', 'Backlogs', 'Risk'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, i) => (
                        <tr key={s.student_id}>
                          <td>{s.student_id}</td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td>{s.department}</td>
                          <td>{s.semester}</td>
                          <td>{s.attendance_percentage?.toFixed(1)}%</td>
                          <td>{s.sgpa?.toFixed(2)}</td>
                          <td>{s.backlogs}</td>
                          <td>
                            <span className={`status-pill ${riskColor(s.risk_level)}`}>{s.risk_level}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card-panel">
            <div className="empty-state" style={{ padding: '4rem', textAlign: 'center' }}>
              <BookOpen size={48} color="#9CA3AF" />
              <p style={{ marginTop: 12, color: 'var(--c-text-secondary)' }}>Select a class to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Create New Class</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateClass} className="modal-form">
              <div className="form-group">
                <label>Class Name *</label>
                <input className="form-input" placeholder="e.g. MCA-2A" value={newClass.name}
                  onChange={e => setNewClass({ ...newClass, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input className="form-input" placeholder="e.g. MCA" value={newClass.department}
                  onChange={e => setNewClass({ ...newClass, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input className="form-input" placeholder="e.g. 2" value={newClass.semester}
                  onChange={e => setNewClass({ ...newClass, semester: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Faculty Modal */}
      {showAssignFacultyModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Assign Faculty to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAssignFacultyModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignFaculty} className="modal-form">
              <div className="form-group">
                <label>Select Faculty</label>
                <div className="select-wrapper">
                  <select className="form-input" value={selectedFacultyId}
                    onChange={e => setSelectedFacultyId(e.target.value)}>
                    <option value="">— Remove faculty assignment —</option>
                    {unassignedFaculties.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                    ))}
                  </select>
                </div>
                {unassignedFaculties.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--c-text-tertiary)', marginTop: 4 }}>All faculty are assigned or none available.</p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowAssignFacultyModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Assign Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Student Modal */}
      {showAddStudentModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Add Student to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAddStudentModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStudent} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Full Name *', key: 'name', placeholder: 'e.g. Riya Sharma' },
                  { label: 'Department *', key: 'department', placeholder: 'e.g. MCA' },
                  { label: 'Semester *', key: 'semester', placeholder: 'e.g. 4' },
                  { label: 'Attendance % *', key: 'attendance_percentage', placeholder: '0–100', type: 'number' },
                  { label: 'SGPA', key: 'sgpa', placeholder: '0.0–10.0', type: 'number' },
                  { label: 'Backlogs', key: 'backlogs', placeholder: '0', type: 'number' },
                  { label: 'Internal Marks', key: 'internal_marks', placeholder: '0–100', type: 'number' },
                  { label: 'Assignment Score', key: 'assignment_score', placeholder: '0–100', type: 'number' },
                ].map(({ label, key, placeholder, type }) => (
                  <div className="form-group" key={key}>
                    <label>{label}</label>
                    <input
                      className="form-input"
                      type={type || 'text'}
                      placeholder={placeholder}
                      value={newStudent[key]}
                      onChange={e => setNewStudent({ ...newStudent, [key]: e.target.value })}
                      required={label.includes('*')}
                      step={type === 'number' ? 'any' : undefined}
                    />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--c-text-tertiary)', marginTop: 8 }}>
                💡 Student ID will be auto-generated (e.g. <strong>MCA250016</strong>)
              </p>
              <div className="form-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowAddStudentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Existing Students Modal */}
      {showAssignExistingModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Assign Students to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAssignExistingModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignExisting} className="modal-form">
              <p style={{ fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 12 }}>
                Showing unassigned students in <strong>{selectedClass?.department}</strong> · Sem <strong>{selectedClass?.semester}</strong>
              </p>
              {unassignedStudents.length === 0 ? (
                <p style={{ color: 'var(--c-text-tertiary)', textAlign: 'center', padding: '1rem' }}>
                  No unassigned students found for this department &amp; semester.
                </p>
              ) : (
                <div style={{ border: '1px solid var(--c-border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Select All row */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderBottom: '1px solid var(--c-border-subtle)',
                    cursor: 'pointer', background: 'var(--c-surface-muted)', fontWeight: 600, fontSize: 13
                  }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                    Select All ({unassignedStudents.length} students)
                  </label>
                  {/* Student list */}
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {unassignedStudents.map(s => (
                      <label key={s.student_id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderBottom: '1px solid var(--c-border-subtle)',
                        cursor: 'pointer', background: selectedStudentIds.includes(s.student_id) ? '#EFF6FF' : '#fff'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.student_id)}
                          onChange={() => toggleStudentSelect(s.student_id)}
                        />
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--c-text-tertiary)' }}>{s.student_id} · {s.department} · Sem {s.semester}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--c-text-tertiary)', marginTop: 8 }}>
                {selectedStudentIds.length} student(s) selected
              </p>
              <div className="form-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowAssignExistingModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading || !selectedStudentIds.length}>
                  {loading ? 'Assigning...' : 'Assign Selected'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClassManagement
