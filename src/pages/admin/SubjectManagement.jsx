import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Plus, Link as LinkIcon, AlertCircle } from 'lucide-react';
import './AdminPanel.css';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [unassignedFaculties, setUnassignedFaculties] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [formData, setFormData] = useState({
        code: '', name: '', department: '', semester: ''
    });
    const [assignData, setAssignData] = useState({ faculty_id: '' });

    useEffect(() => {
        fetchSubjects();
        // Since a faculty can teach multiple subjects, we just fetch ALL faculties for assignment
        // If we want strict "unassigned", we'd need a specific endpoint, but for now we'll fetch all
        // Re-using the unassigned endpoint for now which might need tweaking if faculty teach multiple.
        fetchFaculties();
    }, []);

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/admin/subjects', { credentials: 'omit' });
            if (response.ok) {
                const data = await response.json();
                setSubjects(data.subjects || []);
            }
        } catch (err) {
            console.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculties = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/faculties', { credentials: 'omit' });
            if (response.ok) {
                const data = await response.json();
                setUnassignedFaculties(data.faculties || []);
            }
        } catch (err) {
            console.error("Failed to fetch faculties");
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/admin/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({ code: '', name: '', department: '', semester: '' });
                fetchSubjects();
            } else {
                const data = await response.json();
                alert(data.error || "Failed to create subject");
            }
        } catch (err) {
            alert("Network error creating subject.");
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:5000/api/admin/subjects/${selectedSubject.id}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify(assignData)
            });

            if (response.ok) {
                setShowAssignModal(false);
                fetchSubjects();
            } else {
                const data = await response.json();
                alert(data.error || "Failed to assign faculty");
            }
        } catch (err) {
            alert("Network error assigning faculty.");
        }
    };

    return (
        <div className="dash-container minimal">
            <div className="section-header">
                <div>
                    <h3>Subject & Enrollment Management (V2)</h3>
                    <p>Create subjects and assign them to teaching faculty for granular AI tracking.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} /> New Subject
                </button>
            </div>

            <div className="dashboard-panel">
                <h2><BookOpen size={20} /> Active Subjects</h2>
                <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject Code</th>
                                <th>Name</th>
                                <th>Dept / Sem</th>
                                <th>Assigned Faculty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading subjects...</td></tr>
                            ) : subjects.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No subjects created yet.</td></tr>
                            ) : (
                                subjects.map((sub) => (
                                    <tr key={sub.id}>
                                        <td><strong>{sub.code}</strong></td>
                                        <td>{sub.name}</td>
                                        <td>{sub.department} / S{sub.semester}</td>
                                        <td>
                                            {sub.faculties && sub.faculties.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--c-text-primary)' }}>
                                                    {sub.faculties.map(f => <li key={f.id}>{f.name}</li>)}
                                                </ul>
                                            ) : (
                                                <span style={{ color: 'var(--c-text-tertiary)', fontStyle: 'italic' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-secondary-action"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                onClick={() => {
                                                    setSelectedSubject(sub);
                                                    setShowAssignModal(true);
                                                }}
                                            >
                                                <LinkIcon size={14} /> Assign Faculty
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Subject Modal */}
            {showCreateModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Create New Subject</h3>
                        <form onSubmit={handleCreateSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Subject Code (e.g., CS401)</label>
                                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Subject Name (e.g., Operating Systems)</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Department</label>
                                    <input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Semester</label>
                                    <input type="number" required min="1" max="8" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Faculty Modal */}
            {showAssignModal && selectedSubject && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Assign Faculty to {selectedSubject.code}</h3>
                        <form onSubmit={handleAssignSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Select Faculty</label>
                                <select
                                    required
                                    value={assignData.faculty_id}
                                    onChange={(e) => setAssignData({ faculty_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--c-border)' }}
                                >
                                    <option value="">-- Choose a Faculty Member --</option>
                                    {unassignedFaculties.map(fac => (
                                        <option key={fac.id} value={fac.id}>{fac.name} ({fac.department})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Assign Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;
