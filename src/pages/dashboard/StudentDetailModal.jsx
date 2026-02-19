import React from 'react';
import { X, User, GraduationCap, FileText, AlertCircle } from 'lucide-react';
import './DashboardComponents.css';

const StudentDetailModal = ({ student, onClose }) => {
    if (!student) return null;

    return (
        <div className="modal-overlay sidebar-mode" onClick={onClose}>
            <div className="modal-sidebar" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <User size={20} />
                        <h3>Student Profile</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <div className="student-profile-summary">
                        <div className="profile-id">{student.student_id}</div>
                        <div className="profile-name">{student.name}</div>
                        <div className="profile-dept">{student.department} • Semester {student.semester}</div>
                    </div>

                    <div className="detail-grid">
                        <div className="detail-item">
                            <label>Internal Marks</label>
                            <div className="detail-value">{student.internal_marks} / 50</div>
                        </div>
                        <div className="detail-item">
                            <label>Assignment Score</label>
                            <div className="detail-value">{student.assignment_score} / 25</div>
                        </div>
                        <div className="detail-item full">
                            <label>Academic Risk Analysis</label>
                            <div className={`risk-indicator ${student.risk_level.toLowerCase()}`}>
                                <div className="risk-score-circle">
                                    <span className="score">{student.risk_score}</span>
                                    <span className="label">Risk Score</span>
                                </div>
                                <div className="risk-explanation">
                                    <strong>{student.risk_level} Risk Level</strong>
                                    <p>Prediction based on {student.attendance_percentage}% attendance, {student.sgpa} SGPA, and {student.backlogs} backlogs.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn-secondary">View History</button>
                        <button className="btn-primary">Plan Intervention</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
