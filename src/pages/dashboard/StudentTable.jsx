import React, { useState } from 'react';
import StudentDetailModal from './StudentDetailModal';
import { Search, Filter, ChevronDown } from 'lucide-react';

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
        <div className="student-table-section animate-slide-up">
            <div className="table-controls">
                <div className="search-box-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input-modern"
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

            <div className="card-panel table-card-panel">
                <table className="student-table modern">
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
                            <th>Risk Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student, index) => (
                            <tr key={`${student.student_id}-${student.subject_name || index}`} onClick={() => setSelectedStudent(student)}>
                                <td className="st-id">{student.student_id}</td>
                                <td className="st-name">{student.name}</td>
                                {subjects.length > 1 && <td>{student.subject_name || '-'}</td>}
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
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 4px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)' }}>
                        Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, filteredStudents.length)}</strong> of <strong>{filteredStudents.length}</strong> results
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn-secondary-action"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '6px 14px' }}
                        >
                            Previous
                        </button>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show relevant page numbers (simplified for now)
                                let p = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 2 + i;
                                    if (p > totalPages) p = totalPages - (4 - i);
                                }
                                return (
                                    <button
                                        key={p}
                                        className={`btn-icon ${currentPage === p ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(p)}
                                        style={{
                                            width: '32px', height: '32px',
                                            background: currentPage === p ? 'var(--c-accent-primary)' : 'transparent',
                                            color: currentPage === p ? 'white' : 'var(--c-text-secondary)',
                                            border: currentPage === p ? 'none' : '1px solid var(--c-border-subtle)'
                                        }}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            className="btn-secondary-action"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '6px 14px' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

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
