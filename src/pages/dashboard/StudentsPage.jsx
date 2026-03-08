import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import StudentTable from './StudentTable';
import './Dashboard.css'; // Updated import from DashboardHome.css to Dashboard.css

const StudentsPage = () => {
    const { userProfile } = useOutletContext();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/students', { credentials: 'include' });
            const data = await response.json();
            setStudents(data.students || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
                    <div>
                        <h3>Student Academic Records</h3>
                        <p>Displaying all {students.length} students enrolled in your assigned subjects</p>
                    </div>
                </div>
                <StudentTable students={students} />
            </div>

        </div>
    );
};

export default StudentsPage;
