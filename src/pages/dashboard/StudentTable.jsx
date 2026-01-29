import React, { useState } from 'react';
import './DashboardComponents.css';
import StudentDetailModal from './StudentDetailModal';

const StudentTable = ({ students }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterRisk, setFilterRisk] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || student.department === filterDept;
        const matchesRisk = filterRisk === 'All' || student.risk_level === filterRisk;
        return matchesSearch && matchesDept && matchesRisk;
    });

    const departments = ['All', ...new Set(students.map(s => s.department))];

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
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                        {departments.map(dept => <option key={dept} value={dept}>{dept} Dept</option>)}
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
                            <th>Department</th>
                            <th>Sem</th>
                            <th>Attendance</th>
                            <th>GPA</th>
                            <th>Backlogs</th>
                            <th>Risk Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(student => (
                            <tr key={student.student_id} onClick={() => setSelectedStudent(student)}>
                                <td className="st-id">{student.student_id}</td>
                                <td className="st-name">{student.name}</td>
                                <td>{student.department}</td>
                                <td>{student.semester}</td>
                                <td>{student.attendance_percentage}%</td>
                                <td className="st-sgpa">{student.sgpa}</td>
                                <td className={`st-backlogs ${student.backlogs > 0 ? 'warning' : ''}`}>{student.backlogs}</td>
                                <td>
                                    <span className={`risk-badge minimal ${student.risk_level.toLowerCase()}`}>
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
