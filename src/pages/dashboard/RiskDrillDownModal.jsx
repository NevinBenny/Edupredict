import React from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import './DashboardComponents.css';

const RiskDrillDownModal = ({ riskLevel, students, onClose }) => {
    if (!riskLevel) return null;

    // Normalize riskLevel to match data (e.g., "High Risk" -> "High")
    const normalizedLevel = riskLevel.includes(' ') ? riskLevel.split(' ')[0] : riskLevel;
    const filteredStudents = students.filter(s => s.risk_level === normalizedLevel);

    return (
        <div className="modal-overlay centered" onClick={onClose}>
            <div className="modal-content drilldown-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <AlertCircle size={20} className={normalizedLevel.toLowerCase()} />
                        <h3>{riskLevel} Students</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body scrollable">
                    <div className="drilldown-summary">
                        Found {filteredStudents.length} students in this category.
                    </div>

                    <div className="drilldown-list">
                        {filteredStudents.length > 0 ? (
                            <table className="student-table minimal compact">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Attendance</th>
                                        <th>SGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => (
                                        <tr key={student.student_id}>
                                            <td className="st-id">{student.student_id}</td>
                                            <td className="st-name">{student.name}</td>
                                            <td>{student.attendance_percentage}%</td>
                                            <td className="st-sgpa">{student.sgpa}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state">No students found in this category.</div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button className="btn-primary" onClick={onClose}>Close View</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiskDrillDownModal;
