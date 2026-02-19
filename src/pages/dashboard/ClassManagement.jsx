import { useState, useEffect } from 'react'
import { Users, BookOpen, UserCheck, Plus, Trash2, X, ChevronRight, UserPlus, GraduationCap } from 'lucide-react'
import '../dashboard/Dashboard.css'

const API = 'http://localhost:5000'

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
    level === 'High' ? '#EF4444' : level === 'Medium' ? '#F59E0B' : '#10B981'

  return (
    <div className="dash-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Class Management</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> New Class
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Class List ── */}
        <div className="card">
          <div className="card-header">
            <h3><BookOpen size={16} style={{ marginRight: 6 }} />Classes ({classes.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {classes.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
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
                      padding: '14px 16px',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      background: selectedClass?.id === cls.id ? '#EFF6FF' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#2563EB', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, flexShrink: 0
                    }}>
                      {cls.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#111827' }}>{cls.name}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                        {cls.department || '—'} · Sem {cls.semester || '—'}
                      </p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
                        {cls.faculty_name ? `👤 ${cls.faculty_name}` : '⚠️ No faculty'} · {cls.student_count} students
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="action-btn"
                        style={{ padding: '4px 6px', background: '#FEE2E2', color: '#EF4444', border: 'none' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id) }}
                        title="Delete class"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right: Class Detail ── */}
        {selectedClass ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Class Info Header */}
            <div className="card">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20 }}>{selectedClass.name}</h3>
                  <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 13 }}>
                    {selectedClass.department} · Semester {selectedClass.semester}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {selectedClass.faculty_name
                      ? <span style={{ color: '#10B981' }}>👤 {selectedClass.faculty_name} ({selectedClass.faculty_email})</span>
                      : <span style={{ color: '#EF4444' }}>⚠️ No faculty assigned</span>
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" onClick={() => { fetchUnassignedFaculties(); setShowAssignFacultyModal(true) }}>
                    <UserCheck size={15} style={{ marginRight: 5 }} /> Assign Faculty
                  </button>
                  <button className="btn-primary" onClick={() => {
                    setNewStudent(s => ({ ...s, department: selectedClass.department || '', semester: selectedClass.semester || '' }))
                    setShowAddStudentModal(true)
                  }}>
                    <UserPlus size={15} style={{ marginRight: 5 }} /> Add Student
                  </button>
                  <button className="action-btn" onClick={() => { fetchUnassignedStudents(selectedClass.department, selectedClass.semester); setShowAssignExistingModal(true) }}>
                    <Users size={15} style={{ marginRight: 5 }} /> Assign Existing
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="card">
              <div className="card-header">
                <h3><GraduationCap size={16} style={{ marginRight: 6 }} />Students ({classStudents.length})</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {classStudents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <Users size={36} color="#9CA3AF" />
                    <p style={{ marginTop: 8 }}>No students in this class yet.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        {['ID', 'Name', 'Dept', 'Sem', 'Attendance', 'SGPA', 'Backlogs', 'Risk'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, i) => (
                        <tr key={s.student_id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{s.student_id}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.name}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{s.department}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280' }}>{s.semester}</td>
                          <td style={{ padding: '10px 12px' }}>{s.attendance_percentage?.toFixed(1)}%</td>
                          <td style={{ padding: '10px 12px' }}>{s.sgpa?.toFixed(2)}</td>
                          <td style={{ padding: '10px 12px' }}>{s.backlogs}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: riskColor(s.risk_level) + '20',
                              color: riskColor(s.risk_level),
                              padding: '2px 8px', borderRadius: 20, fontWeight: 600, fontSize: 11
                            }}>{s.risk_level}</span>
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
          <div className="card">
            <div className="empty-state" style={{ padding: '4rem' }}>
              <BookOpen size={48} color="#9CA3AF" />
              <p style={{ marginTop: 12, color: '#6B7280' }}>Select a class to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
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
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
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
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Assign Faculty to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAssignFacultyModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignFaculty} className="modal-form">
              <div className="form-group">
                <label>Select Faculty</label>
                <select className="form-input" value={selectedFacultyId}
                  onChange={e => setSelectedFacultyId(e.target.value)}>
                  <option value="">— Remove faculty assignment —</option>
                  {unassignedFaculties.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                  ))}
                </select>
                {unassignedFaculties.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>All faculty are already assigned to classes.</p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignFacultyModal(false)}>Cancel</button>
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
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Add Student to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAddStudentModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStudent} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                💡 Student ID will be auto-generated (e.g. <strong>MCA250016</strong>)
              </p>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddStudentModal(false)}>Cancel</button>
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
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Assign Students to {selectedClass?.name}</h3>
              <button className="close-btn" onClick={() => setShowAssignExistingModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignExisting} className="modal-form">
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                Showing unassigned students in <strong>{selectedClass?.department}</strong> · Sem <strong>{selectedClass?.semester}</strong>
              </p>
              {unassignedStudents.length === 0 ? (
                <p style={{ color: '#6B7280', textAlign: 'center', padding: '1rem' }}>
                  No unassigned students found for this department &amp; semester.
                </p>
              ) : (
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Select All row */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderBottom: '2px solid #E5E7EB',
                    cursor: 'pointer', background: '#F9FAFB', fontWeight: 600, fontSize: 13
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
                        padding: '10px 14px', borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer', background: selectedStudentIds.includes(s.student_id) ? '#EFF6FF' : '#fff'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.student_id)}
                          onChange={() => toggleStudentSelect(s.student_id)}
                        />
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{s.student_id} · {s.department} · Sem {s.semester}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                {selectedStudentIds.length} student(s) selected
              </p>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignExistingModal(false)}>Cancel</button>
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
