import React, { useEffect, useState } from 'react';
import StudentTable from './StudentTable';
import './DashboardHome.css';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/students', {
                    credentials: 'include'    // ← required for session cookies
                });
                const data = await response.json();

                if (data.error) {
                    setError(data.error);
                } else {
                    setStudents(Array.isArray(data.students) ? data.students : []);
                }
            } catch (err) {
                console.error('Error fetching students:', err);
                setError('Failed to load students.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    if (loading) {
        return (
            <div className="dash-loading">
                <p>Loading student academic records...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-loading">
                <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
            </div>
        );
    }

    return (
        <div className="dash-container minimal">
            <div className="primary-section" style={{ width: '100%' }}>
                <div className="section-header">
                    <h3>Student Academic Records</h3>
                    <p>Displaying {students.length} student{students.length !== 1 ? 's' : ''} assigned to your courses</p>
                </div>
                <StudentTable students={students} />
            </div>
        </div>
    );
};

export default StudentsPage;
