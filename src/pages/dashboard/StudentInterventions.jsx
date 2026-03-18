import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css'; // Reusing some styles

const StudentInterventions = () => {
    const [interventions, setInterventions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInterventions();
    }, []);

    const fetchInterventions = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/interventions`, { credentials: 'include' });
            const data = await response.json();
            if (data.interventions) {
                setInterventions(data.interventions);
            }
        } catch (error) {
            console.error("Error fetching interventions:", error);
            toast.error("Failed to load your tasks");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, nextStatus, file) => {
        try {
            const formData = new FormData();
            formData.append('status', nextStatus);
            if (file) {
                formData.append('file', file);
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/interventions/${id}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
            if (response.ok) {
                toast.success(`Task marked as ${nextStatus}`);
                fetchInterventions();
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to update task status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update task status");
        }
    };

    if (loading) {
        return <div className="dash-loading">Loading your assigned tasks...</div>;
    }

    const active = interventions.filter(i => i.status !== 'Completed');
    const completed = interventions.filter(i => i.status === 'Completed');

    return (
        <div className="dash-container minimal">
            <div className="section-header">
                <h2>My Assigned Interventions</h2>
                <p>Support tasks and materials assigned to you by faculty.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginTop: '2rem' }}>
                <div className="intervention-main">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={20} color="var(--c-status-warn)" />
                        Active Tasks ({active.length})
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {active.length === 0 ? (
                            <div className="empty-state" style={{ padding: '3rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                                <CheckCircle size={40} color="var(--c-status-safe)" style={{ margin: '0 auto 1rem auto' }} />
                                <p style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>All caught up!</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--c-text-secondary)' }}>You have no active interventions at the moment.</p>
                            </div>
                        ) : (
                            active.map(task => (
                                <InterventionCard key={task.id} task={task} onUpdate={handleStatusUpdate} />
                            ))
                        )}
                    </div>

                    {completed.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '1rem', marginTop: '3rem', marginBottom: '1.5rem', color: 'var(--c-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={18} />
                                Recently Completed
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
                                {completed.map(task => (
                                    <InterventionCard key={task.id} task={task} onUpdate={handleStatusUpdate} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="intervention-sidebar">
                    <div className="card" style={{ background: 'var(--c-bg-app)', border: '1px dashed var(--c-border-subtle)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <AlertCircle size={18} color="var(--c-accent-primary)" />
                            About Interventions
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--c-text-secondary)', lineHeight: '1.5' }}>
                            Interventions are academic support tasks assigned by your instructors to help improve your performance.
                            Complete these tasks promptly and download any attached materials for study.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InterventionCard = ({ task, onUpdate }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const isCompleted = task.status === 'Completed';
    const isInProgress = task.status === 'In Progress';

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: '12px',
            padding: '1.5rem',
            borderLeft: `5px solid ${isCompleted ? 'var(--c-status-safe)' : (isInProgress ? 'var(--c-accent-primary)' : 'var(--c-status-warn)')}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{task.title}</h4>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--c-text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className={`status-badge-inline ${task.status.toLowerCase().replace(' ', '-')}`}>
                            ● {task.status === 'Completed' ? 'Approved & Completed' : task.status}
                        </span>
                    </div>
                </div>
                {task.file_path && (
                    <a
                        href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/uploads/interventions/${task.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="download-btn"
                        title="Download Material"
                    >
                        <Download size={16} /> Reference Material
                    </a>
                )}
            </div>

            {task.description && (
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    {task.description}
                </p>
            )}

            {(isCompleted || task.status === 'Submitted') && task.submission_file_path && (
                <div style={{ marginTop: '1rem', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-text-secondary)', fontSize: '0.9rem' }}>
                        <CheckCircle size={16} color={isCompleted ? "var(--c-status-safe)" : "var(--c-status-warn)"} />
                        {isCompleted ? "Your Submission (Approved)" : "Your Submission (Pending Approval)"}
                    </div>
                    <a
                        href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/uploads/interventions/submissions/${task.submission_file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="download-btn"
                    >
                        View File
                    </a>
                </div>
            )}

            {!isCompleted && task.status !== 'Submitted' && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--c-text-secondary)', marginBottom: '8px' }}>
                            Upload Submission (Optional)
                        </label>
                        <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            style={{ fontSize: '0.85rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        {!isInProgress && (
                            <button
                                onClick={() => onUpdate(task.id, 'In Progress', null)}
                                className="sd-btn sd-btn-outline"
                                style={{ fontWeight: 700 }}
                            >
                                Mark as In Progress
                            </button>
                        )}
                        <button
                            onClick={() => onUpdate(task.id, 'Submitted', selectedFile)}
                            className="sd-btn sd-btn-primary"
                            style={{ background: 'var(--c-status-safe)', fontWeight: 700 }}
                        >
                            {selectedFile ? 'Submit for Approval' : 'Mark as Submitted'}
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .status-badge-inline { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-badge-inline.pending { color: var(--c-status-warn); }
                .status-badge-inline.in-progress { color: var(--c-accent-primary); }
                .status-badge-inline.submitted { color: var(--c-status-warn); }
                .status-badge-inline.completed { color: var(--c-status-safe); }
            `}</style>
        </div>
    );
};

export default StudentInterventions;
