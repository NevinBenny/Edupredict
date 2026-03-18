import React, { useState } from 'react';
import './DashboardComponents.css';
import StudentDetailModal from './StudentDetailModal';

const StudentTable = ({ students = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterDept, setFilterDept] = useState('All');
    const [filterRisk, setFilterRisk] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Safety guard
    const safeStudents = Array.isArray(students) ? students : [];

    const filteredStudents = safeStudents.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || student.department === filterDept;
        const matchesRisk = filterRisk === 'All' ||
            (student.risk_level && student.risk_level.toLowerCase() === filterRisk.toLowerCase());
        const matchesSubject = filterSubject === 'All' || student.subject_name === filterSubject;
        return matchesSearch && matchesDept && matchesRisk && matchesSubject;
    });

    const departments = ['All', ...new Set(safeStudents.map(s => s.department))];
    const subjects = ['All', ...new Set(safeStudents.map(s => s.subject_name).filter(Boolean))];

    return (
        <div className="student-table-section">
            <div className="table-controls minimal">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by ID or Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filters">
                    {subjects.length > 1 && (
                        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                            {subjects.map(sub => <option key={sub} value={sub}>{sub === 'All' ? 'All Subjects' : sub}</option>)}
                        </select>
                    )}
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                        {departments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'All Dept' : dept + ' Dept'}</option>)}
                    </select>
                    <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                        <option value="All">All Risk</option>
                        <option value="Low">Low Risk</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High Risk</option>
                    </select>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="student-table minimal">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            {subjects.length > 1 && <th>Subject</th>}
                            <th>Department</th>
                            <th>Sem</th>
                            <th>Attendance</th>
                            <th>GPA</th>
                            <th>Backlogs</th>
                            <th>Risk Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student, index) => (
                            <tr key={`${student.student_id}-${student.subject_name || index}`} onClick={() => setSelectedStudent(student)}>
                                <td className="st-id">#{index + 1}</td>
                                <td>
                                    <div className="user-info-cell">
                                        <div className="user-avatar-sm">
                                            {student.name ? student.name[0].toUpperCase() : 'S'}
                                        </div>
                                        <div className="user-details">
                                            <span className="st-name">{student.name}</span>
                                            <span className="sub-detail">{student.student_id}</span>
                                        </div>
                                    </div>
                                </td>
                                {subjects.length > 1 && <td>{student.subject_name || '-'}</td>}
                                <td>
                                    <span className="status-badge status-secondary">{student.department}</span>
                                </td>
                                <td>
                                    <span className="pill-badge pill-info">{student.semester}</span>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700, color: 'var(--c-text-primary)' }}>
                                        {student.attendance_percentage}%
                                    </div>
                                </td>
                                <td className="st-sgpa">{student.sgpa}</td>
                                <td className={`st-backlogs ${student.backlogs > 0 ? 'warning' : ''}`}>
                                    {student.backlogs > 0 ? (
                                        <span className="pill-badge pill-warning">{student.backlogs}</span>
                                    ) : '0'}
                                </td>
                                <td>
                                    <span className={`risk-badge ${student.risk_level.toLowerCase()}`}>
                                        {student.risk_level}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
};

export default StudentTable;
