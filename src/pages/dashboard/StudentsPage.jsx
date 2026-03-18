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
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/students`, {
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
        <div className="dash-page">
            <div className="primary-section">
                <div className="section-main">
                    <div className="panel-header">
                        <h3 className="panel-title">Student Academic Records</h3>
                        <span className="metric-footer" style={{ marginTop: 0 }}>
                            Displaying {students.length} student{students.length !== 1 ? 's' : ''} assigned to your courses
                        </span>
                    </div>
                    <StudentTable students={students} />
                </div>
            </div>
        </div>
    );
};

export default StudentsPage;
