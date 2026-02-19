import React, { useState } from 'react';
import StudentDetailModal from './StudentDetailModal';
import { Search, Filter, ChevronDown } from 'lucide-react';

const StudentTable = ({ students }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterRisk, setFilterRisk] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [itemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || student.department === filterDept;
        const matchesRisk = filterRisk === 'All' || student.risk_level === filterRisk;
        return matchesSearch && matchesDept && matchesRisk;
    });

    // Reset page on filter change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDept, filterRisk]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    const departments = ['All', ...new Set(students.map(s => s.department))];

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
                <div className="filters-group">
                    {/* Only show Department filter if there is more than 1 distinct department */}
                    {new Set(students.map(s => s.department)).size > 1 && (
                        <div className="select-wrapper">
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                                {departments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>)}
                            </select>
                            <ChevronDown size={14} className="select-arrow" />
                        </div>
                    )}
                    <div className="select-wrapper">
                        <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                            <option value="All">All Risk Levels</option>
                            <option value="Low">Low Risk</option>
                            <option value="Medium">Medium Risk</option>
                            <option value="High">High Risk</option>
                        </select>
                        <ChevronDown size={14} className="select-arrow" />
                    </div>
                </div>
            </div>

            <div className="card-panel table-card-panel">
                <table className="student-table modern">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Student Name</th>
                            <th>Department</th>
                            <th>Sem</th>
                            <th>Attendance</th>
                            <th>GPA</th>
                            <th>Backlogs</th>
                            <th>Risk Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? (
                            currentItems.map(student => (
                                <tr key={student.student_id} onClick={() => setSelectedStudent(student)}>
                                    <td className="font-mono text-secondary">{student.student_id}</td>
                                    <td>
                                        <div className="student-name-cell">
                                            <div className="student-avatar-small">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-semibold">{student.name}</span>
                                        </div>
                                    </td>
                                    <td>{student.department}</td>
                                    <td>{student.semester}</td>
                                    <td>
                                        <div className="progress-bar-cell">
                                            <span className="text-sm">{student.attendance_percentage}%</span>
                                            <div className="progress-track">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${student.attendance_percentage}%`,
                                                        background: student.attendance_percentage < 75 ? 'var(--c-status-danger)' : 'var(--c-status-safe)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-bold">{student.sgpa}</td>
                                    <td>
                                        {student.backlogs > 0 ? (
                                            <span className="badge-warn">{student.backlogs} Pending</span>
                                        ) : (
                                            <span className="text-secondary">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-pill ${student.risk_level.toLowerCase()}`}>
                                            <span className="status-dot"></span>
                                            {student.risk_level}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--c-text-tertiary)' }}>No students found matching your filters.</p>
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
