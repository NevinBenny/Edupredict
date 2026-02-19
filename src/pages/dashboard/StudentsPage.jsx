import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import StudentTable from './StudentTable';
import './DashboardHome.css';

const StudentsPage = () => {
    const { userProfile } = useOutletContext();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newStudent, setNewStudent] = useState({
        name: '',
        attendance_percentage: '',
        sgpa: '',
        backlogs: '',
        internal_marks: '',
        assignment_score: ''
    });

    const fetchStudents = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/students', { credentials: 'include' });
            const data = await response.json();
            setStudents(data.students || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('http://localhost:5000/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newStudent)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add student');

            alert('Student added successfully!');
            setShowAddModal(false);
            setNewStudent({ name: '', attendance_percentage: '', sgpa: '', backlogs: '', internal_marks: '', assignment_score: '' });
            fetchStudents();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="dash-loading">
                <p>Loading student academic records...</p>
            </div>
        );
    }

    return (
        <div className="dash-container minimal">
            <div className="primary-section" style={{ width: '100%' }}>
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3>Student Academic Records</h3>
                        <p>Displaying all {students.length} students currently in the database</p>
                    </div>
                    {userProfile?.role === 'FACULTY' && (
                        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UserPlus size={16} /> Add Student
                        </button>
                    )}
                </div>
                <StudentTable students={students} />
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>Add Student to Your Class</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddStudent} className="modal-form">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Rahul Verma"
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label>Attendance % *</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0-100"
                                        value={newStudent.attendance_percentage}
                                        onChange={e => setNewStudent({ ...newStudent, attendance_percentage: e.target.value })}
                                        required
                                        min="0" max="100" step="0.1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>SGPA</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0.0-10.0"
                                        value={newStudent.sgpa}
                                        onChange={e => setNewStudent({ ...newStudent, sgpa: e.target.value })}
                                        min="0" max="10.0" step="0.01"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Internal Marks</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0-100"
                                        value={newStudent.internal_marks}
                                        onChange={e => setNewStudent({ ...newStudent, internal_marks: e.target.value })}
                                        min="0" max="100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Assignment Score</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0-100"
                                        value={newStudent.assignment_score}
                                        onChange={e => setNewStudent({ ...newStudent, assignment_score: e.target.value })}
                                        min="0" max="100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Backlogs</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0"
                                        value={newStudent.backlogs}
                                        onChange={e => setNewStudent({ ...newStudent, backlogs: e.target.value })}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="info-box" style={{ background: '#EFF6FF', padding: 12, borderRadius: 8, marginTop: 12, fontSize: 13, color: '#1E40AF' }}>
                                ℹ️ <b>Note:</b> Student ID will be auto-generated based on your class department. The student will be automatically assigned to your class.
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Adding...' : 'Add Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsPage;
