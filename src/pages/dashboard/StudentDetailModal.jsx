import React, { useEffect } from 'react';
import { X, Calendar, BookOpen, AlertCircle, History, Stethoscope } from 'lucide-react';
import './StudentDetailModal.css';

const StudentDetailModal = ({ student, onClose }) => {
    // Prevent scrolling on body when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!student) return null;

    // Get initials for the avatar
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Calculate dynamic risk level class
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

                <div className="sd-body">
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

                    {/* Quick Analytics Grid */}
                    <div className="sd-metrics-grid">
                        <div className="sd-metric-card">
                            <div className="sd-metric-label">
                                <Calendar size={14} /> Attendance
                            </div>
                            <div className="sd-metric-value">
                                {student.attendance_percentage}<span>%</span>
                            </div>
                        </div>
                        <div className="sd-metric-card">
                            <div className="sd-metric-label">
                                <BookOpen size={14} /> CGPA
                            </div>
                            <div className="sd-metric-value">
                                {student.sgpa}
                            </div>
                        </div>
                        <div className="sd-metric-card">
                            <div className="sd-metric-label">
                                Internal Marks
                            </div>
                            <div className="sd-metric-value">
                                {student.internal_marks} <span>/ 50</span>
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
                                <span className="sd-risk-val">{student.risk_score}</span>
                                <span className="sd-risk-lbl">Index</span>
                            </div>
                            <div className="sd-risk-details">
                                <h4>{student.risk_level} Risk Trajectory</h4>
                                <p>
                                    Based on {student.attendance_percentage}% attendance stability combined with current SGPA of {student.sgpa} and {student.backlogs} recorded backlogs.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="sd-actions">
                        <button className="sd-btn sd-btn-outline">
                            <History size={16} /> History
                        </button>
                        <button className="sd-btn sd-btn-primary">
                            <Stethoscope size={16} /> Intervene
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StudentDetailModal;
