import React, { useEffect, useState } from 'react';
import StudentTable from './StudentTable';
import './DashboardHome.css';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/students');
                const data = await response.json();
                setStudents(data.students);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching students:', error);
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

    return (
        <div className="dash-container minimal">
            <div className="primary-section" style={{ width: '100%' }}>
                <div className="section-header">
                    <h3>Student Academic Records</h3>
                    <p>Displaying all {students.length} students currently in the database</p>
                </div>
                <StudentTable students={students} />
            </div>
        </div>
    );
};

export default StudentsPage;
