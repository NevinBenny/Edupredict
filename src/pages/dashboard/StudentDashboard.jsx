import React, { useEffect, useState } from 'react';
import './DashboardHome.css'; // Reuse existing styles
import { Book, CheckCircle, AlertTriangle } from 'lucide-react';
import { getMyCourses } from '../../services/api';

const StudentDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMyCourses = async () => {
            try {
                const data = await getMyCourses();
                setCourses(data.courses || []);
            } catch (err) {
                setError(err.message || 'Failed to load enrolled courses');
            } finally {
                setLoading(false);
            }
        };
        fetchMyCourses();
    }, []);

    if (loading) {
        return (
            <div className="dash-loading">
                <p>Loading your courses...</p>
            </div>
        );
    }

    return (
        <div className="dash-container minimal">
            <div className="section-header" style={{ marginBottom: '2rem' }}>
                <h2>My Enrolled Courses</h2>
                <p>You are currently enrolled in {courses.length} course{courses.length !== 1 ? 's' : ''}</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="stats-grid">
                {courses.length === 0 && !loading && !error && (
                    <p style={{ color: 'var(--c-text-secondary)', padding: '2rem' }}>
                        No courses assigned yet. Please contact your coordinator.
                    </p>
                )}

                {courses.map((course, idx) => (
                    <div key={`${course.course_code}-${idx}`} style={{
                        background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--c-border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Book size={18} color="var(--c-primary)" />
                                    {course.subject_name}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--c-text-secondary)' }}>
                                    {course.course_code} • {course.department} Dept • Sem {course.semester}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem', background: 'var(--c-surface)', padding: '1rem', borderRadius: '8px' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', margin: '0 0 0.25rem 0' }}>Attendance</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ fontWeight: 600 }}>{course.attendance_percentage}%</span>
                                    {course.attendance_percentage < 75 ? (
                                        <AlertTriangle size={14} color="var(--c-danger)" />
                                    ) : (
                                        <CheckCircle size={14} color="var(--c-success)" />
                                    )}
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', margin: '0 0 0.25rem 0' }}>Internal Marks</p>
                                <span style={{ fontWeight: 600 }}>{course.internal_marks || '-'}</span>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', margin: '0 0 0.25rem 0' }}>Assignment</p>
                                <span style={{ fontWeight: 600 }}>{course.assignment_score || '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentDashboard;
