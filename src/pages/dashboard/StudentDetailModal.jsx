import React, { useEffect, useState } from 'react';
import { X, Calendar, BookOpen, AlertCircle, History, Stethoscope, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDetailModal.css';

const StudentDetailModal = ({ student, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, history
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    // History State
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Intervention Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Fetch history when history tab is selected
    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await fetch(`http://localhost:5000/api/interventions?student_id=${student.student_id}`);
            const data = await response.json();
            if (data.interventions) {
                setHistoryData(data.interventions);
            }
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleAssignIntervention = async (e) => {
        e.preventDefault();
        if (!title) return toast.error("Please enter a title for the intervention.");

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('student_id', student.student_id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('due_date', dueDate);
        if (file) {
            formData.append('file', file);
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/interventions`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                toast.success("Intervention assigned successfully!");
                setTitle('');
                setDescription('');
                setDueDate('');
                setFile(null);
                setIsAssignOpen(false);
                setActiveTab('history'); // Switch to history to show the new assignment
            } else {
                toast.error("Failed to assign intervention.");
            }
        } catch (error) {
            toast.error("Error creating intervention.");
            console.error("Error creating intervention:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!student) return null;

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const riskClass = student.risk_level ? student.risk_level.toLowerCase() : 'low';

    return (
        <div className="sd-modal-overlay" onClick={onClose}>
            <div className="sd-modal-sidebar" onClick={e => e.stopPropagation()}>

                {/* Visual Banner Header */}
                <div className="sd-header-banner">
                    <button className="sd-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                    <div className="sd-avatar-wrapper">
                        <div className="sd-avatar">
                            {getInitials(student.name)}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="sd-tabs" style={{ marginTop: '36px' }}>
                    <button
                        className={`sd-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`sd-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>

                <div className="sd-body" style={{ paddingTop: '24px' }}>

                    {/* Identification */}
                    <div className="sd-profile-info">
                        <div className="sd-meta">
                            <span className="sd-meta-badge">{student.student_id}</span>
                        </div>
                        <h2 className="sd-name">{student.name}</h2>
                        <div className="sd-meta" style={{ marginTop: '4px' }}>
                            <BookOpen size={14} /> {student.department}
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            Semester {student.semester}
                        </div>
                    </div>

                    {/* OVERVIEW TAB CONTENT */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Quick Analytics Grid */}
                            <div className="sd-metrics-grid">
                                <div className="sd-metric-card">
                                    <div className="sd-metric-label">
                                        <Calendar size={14} /> Attendance
                                    </div>
                                    <div className="sd-metric-value">
                                        {Number(student.attendance_percentage).toFixed(2)}<span>%</span>
                                    </div>
                                </div>
                                <div className="sd-metric-card">
                                    <div className="sd-metric-label">
                                        <BookOpen size={14} /> CGPA
                                    </div>
                                    <div className="sd-metric-value">
                                        {Number(student.sgpa).toFixed(2)}
                                    </div>
                                </div>
                                <div className="sd-metric-card">
                                    <div className="sd-metric-label">
                                        Internal Marks
                                    </div>
                                    <div className="sd-metric-value">
                                        {Number(student.internal_marks).toFixed(2)} <span>/ 50</span>
                                    </div>
                                </div>
                                <div className="sd-metric-card">
                                    <div className="sd-metric-label">
                                        Backlogs
                                    </div>
                                    <div className="sd-metric-value" style={{ color: student.backlogs > 0 ? '#ef4444' : 'inherit' }}>
                                        {student.backlogs}
                                    </div>
                                </div>
                            </div>

                            {/* Deep Risk Analysis Card */}
                            <div>
                                <div className="sd-metric-label" style={{ marginBottom: '12px' }}>
                                    <AlertCircle size={14} /> Predictive Analysis
                                </div>
                                <div className={`sd-risk-card ${riskClass}`}>
                                    <div className="sd-risk-score">
                                        <span className="sd-risk-val">{Number(student.risk_score).toFixed(2)}</span>
                                        <span className="sd-risk-lbl">Index</span>
                                    </div>
                                    <div className="sd-risk-details">
                                        <h4>{student.risk_level} Risk Trajectory</h4>
                                        <p>
                                            Based on {Number(student.attendance_percentage).toFixed(2)}% attendance stability combined with current SGPA of {Number(student.sgpa).toFixed(2)} and {student.backlogs} recorded backlogs.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* HISTORY TAB CONTENT */}
                    {activeTab === 'history' && (
                        <div>
                            <div className="sd-metric-label" style={{ marginBottom: '16px' }}>
                                <History size={14} /> Disciplinary & Intervention History
                            </div>

                            {loadingHistory ? (
                                <div className="sd-empty">Fetching records...</div>
                            ) : historyData.length > 0 ? (
                                <div className="sd-history-list">
                                    {historyData.map((item) => (
                                        <div key={item.id} className="sd-history-card">
                                            <div className="sd-history-header">
                                                <h4 className="sd-history-title">{item.title}</h4>
                                                <span className={`sd-history-status ${item.status.replace(' ', '')}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            {item.description && (
                                                <p className="sd-history-meta" style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                                    "{item.description}"
                                                </p>
                                            )}
                                            <p className="sd-history-meta">
                                                Created: {new Date(item.assigned_date).toLocaleDateString()}
                                                {item.due_date && ` • Due: ${new Date(item.due_date).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="sd-empty">
                                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
                                    No past interventions found for this student.
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Sticky Footer */}
                <div className="sd-sidebar-footer">
                    <button className="sd-btn sd-btn-primary full-width" onClick={() => setIsAssignOpen(true)}>
                        <Stethoscope size={16} /> Plan Intervention
                    </button>
                </div>

            </div>

            {/* Embedded Assignment Popup Modal */}
            {isAssignOpen && (
                <div className="sd-popup-overlay" onClick={() => setIsAssignOpen(false)}>
                    <div className="sd-popup-content" onClick={e => e.stopPropagation()}>
                        <div className="sd-popup-header">
                            <h3>Assign New Intervention Task</h3>
                            <button className="sd-close-btn small" onClick={() => setIsAssignOpen(false)} title="Close">
                                <X size={16} />
                            </button>
                        </div>
                        <form className="sd-form popup-form" onSubmit={handleAssignIntervention}>
                            <div className="sd-input-group">
                                <label>Task Title *</label>
                                <input
                                    type="text"
                                    className="sd-input"
                                    placeholder="e.g. Remedial Math Assignment"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="sd-input-group">
                                <label>Description</label>
                                <textarea
                                    className="sd-input"
                                    rows="3"
                                    placeholder="Add specific instructions for the student..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="sd-form-row">
                                <div className="sd-input-group">
                                    <label>Due Date</label>
                                    <input
                                        type="date"
                                        className="sd-input"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                                <div className="sd-input-group">
                                    <label>Attach PDF</label>
                                    <input
                                        type="file"
                                        className="sd-input file-input"
                                        accept="application/pdf"
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                </div>
                            </div>
                            <div className="sd-btn-group popup-actions">
                                <button type="button" className="sd-btn sd-btn-outline" onClick={() => setIsAssignOpen(false)}>Cancel</button>
                                <button
                                    type="submit"
                                    className="sd-btn sd-btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Assigning...' : 'Assign Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StudentDetailModal;
