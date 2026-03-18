import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import './DashboardComponents.css';

const AddStudentModal = ({ onClose, onStudentAdded }) => {
    const [formData, setFormData] = useState({
        student_id: '',
        name: '',
        subject_id: '',
        attendance_percentage: '',
        internal_marks: '',
        assignment_score: ''
    });

    const [subjects, setSubjects] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch subjects assigned to this faculty member for the dropdown
        const fetchSubjects = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/faculty-subjects`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setSubjects(data.subjects || []);
                    if (data.subjects && data.subjects.length > 0) {
                        setFormData(prev => ({ ...prev, subject_id: data.subjects[0].id }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
                setError('Failed to load classes.');
            }
        };
        fetchSubjects();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add student');
            }

            onStudentAdded();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay centered" onClick={onClose}>
            <div className="modal-content add-student-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <UserPlus size={20} />
                        <h3>Add New Student Record</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {error && <div className="form-error">{error}</div>}

                    <div className="form-grid">
                        <div className="form-item">
                            <label>Student ID</label>
                            <input
                                name="student_id"
                                value={formData.student_id}
                                onChange={handleChange}
                                placeholder="e.g. EDU001"
                                required
                            />
                        </div>
                        <div className="form-item">
                            <label>Full Name</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Arjun Kumar"
                                required
                            />
                        </div>
                        <div className="form-item" style={{ gridColumn: 'span 2' }}>
                            <label>Subject / Course</label>
                            <select name="subject_id" value={formData.subject_id} onChange={handleChange} required>
                                {subjects.length === 0 ? (
                                    <option value="">No subjects assigned</option>
                                ) : (
                                    subjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.code} - {sub.name} ({sub.department}, Sem {sub.semester})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="form-item">
                            <label>Attendance (%)</label>
                            <input
                                name="attendance_percentage"
                                type="number"
                                step="0.1"
                                value={formData.attendance_percentage}
                                onChange={handleChange}
                                placeholder="0-100"
                                required
                            />
                        </div>

                        <div className="form-item">
                            <label>Internal Marks (/50)</label>
                            <input
                                name="internal_marks"
                                type="number"
                                value={formData.internal_marks}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-item">
                            <label>Assignment Score (/25)</label>
                            <input
                                name="assignment_score"
                                type="number"
                                value={formData.assignment_score}
                                onChange={handleChange}
                            />
                        </div>

                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Student Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentModal;
