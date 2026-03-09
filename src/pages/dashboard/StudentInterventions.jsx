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
            const response = await fetch('http://localhost:5000/api/interventions', { credentials: 'include' });
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

    const handleStatusUpdate = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'Pending' ? 'In Progress' : 'Completed';
        try {
            const response = await fetch(`http://localhost:5000/api/interventions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
                credentials: 'include'
            });
            if (response.ok) {
                toast.success(`Task marked as ${nextStatus}`);
                fetchInterventions();
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update task status");
        }
    };

    if (loading) {
        return <div className="dash-loading">Loading your assigned tasks...</div>;
    }

    const pending = interventions.filter(i => i.status !== 'Completed');
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
                        <Clock size={20} color="var(--risk-medium)" />
                        Active Tasks ({pending.length})
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pending.length === 0 ? (
                            <div className="empty-state" style={{ padding: '3rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                                <CheckCircle size={40} color="var(--risk-low)" style={{ margin: '0 auto 1rem auto' }} />
                                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>You have no pending interventions at the moment.</p>
                            </div>
                        ) : (
                            pending.map(task => (
                                <InterventionCard key={task.id} task={task} onUpdate={handleStatusUpdate} />
                            ))
                        )}
                    </div>

                    {completed.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '1rem', marginTop: '3rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <div className="card" style={{ background: 'var(--bg-app)', border: '1px dashed var(--border-color)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <AlertCircle size={18} color="var(--accent-blue)" />
                            About Interventions
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
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
    const isCompleted = task.status === 'Completed';
    const isInProgress = task.status === 'In Progress';

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            borderLeft: `5px solid ${isCompleted ? 'var(--risk-low)' : (isInProgress ? 'var(--accent-blue)' : 'var(--risk-medium)')}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{task.title}</h4>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className={`status-badge-inline ${task.status.toLowerCase().replace(' ', '-')}`}>
                            ● {task.status}
                        </span>
                    </div>
                </div>
                {task.file_path && (
                    <a
                        href={`http://localhost:5000/api/uploads/interventions/${task.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="download-btn"
                        style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px', color: 'var(--accent-blue)' }}
                        title="Download Material"
                    >
                        <Download size={18} />
                    </a>
                )}
            </div>

            {task.description && (
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    {task.description}
                </p>
            )}

            {!isCompleted && (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => onUpdate(task.id, task.status)}
                        style={{
                            background: isInProgress ? 'var(--risk-low)' : 'var(--accent-blue)',
                            color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >
                        {isInProgress ? 'Mark as Completed' : 'Start Task'}
                    </button>
                </div>
            )}

            <style jsx>{`
                .status-badge-inline { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-badge-inline.pending { color: var(--risk-medium); }
                .status-badge-inline.in-progress { color: var(--accent-blue); }
                .status-badge-inline.completed { color: var(--risk-low); }
            `}</style>
        </div>
    );
};

export default StudentInterventions;
