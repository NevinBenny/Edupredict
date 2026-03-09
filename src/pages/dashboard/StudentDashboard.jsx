import React, { useEffect, useState } from 'react';
import { Book, CheckCircle, AlertTriangle, GraduationCap, Calendar, TrendingUp } from 'lucide-react';
import { getMyCourses, getAccountProfile } from '../../services/api';
import MetricCard from './MetricCard';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // 1. Fetch summary from the new endpoint
                const summaryRes = await fetch('http://localhost:5000/api/dashboard/my-summary', { credentials: 'include' });
                if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setSummary(summaryData);
                }

                // 2. Fetch courses
                const coursesData = await getMyCourses();
                setCourses(coursesData.courses || []);
            } catch (err) {
                setError(err.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="dash-loading">
                <Spinner />
                <p>Preparing your academic portal...</p>
            </div>
        );
    }

    const riskClass = summary?.risk_level?.toLowerCase() || 'low';

    return (
        <div className="dash-container minimal">
            {/* Welcome Banner */}
            <div className="student-welcome-banner">
                <div className="welcome-text">
                    <p>Welcome back,</p>
                    <h2>{summary?.name || 'Student'}</h2>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase', display: 'block' }}>Department</span>
                        <span style={{ fontWeight: 600 }}>{summary?.department}</span>
                    </div>
                    <div>
                        <span style={{ opacity: 0.7, fontSize: '0.8rem', textTransform: 'uppercase', display: 'block' }}>Current Semester</span>
                        <span style={{ fontWeight: 600 }}>Semester {summary?.semester}</span>
                    </div>
                </div>
            </div>

            {/* Risk Alert */}
            <div className={`student-risk-banner ${riskClass}`}>
                {riskClass === 'high' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                <div>
                    Status: <span style={{ textTransform: 'capitalize' }}>{summary?.risk_level} Risk Profile</span>
                    {riskClass === 'high' && <span style={{ marginLeft: '8px', opacity: 0.8, fontWeight: 400 }}>• We recommend reviewing your interventions.</span>}
                </div>
            </div>

            {/* Performance Overview */}
            <div className="student-metrics">
                <MetricCard
                    label="Current GPA"
                    value={summary?.sgpa || '0.0'}
                    unit="SGPA"
                    icon={<GraduationCap size={20} />}
                    color="var(--accent-blue)"
                    trend="up"
                    trendValue="Latest"
                />
                <MetricCard
                    label="Attendance"
                    value={`${summary?.avg_attendance || 0}%`}
                    unit="Overall"
                    icon={<Calendar size={20} />}
                    color={summary?.avg_attendance < 75 ? "var(--risk-high)" : "var(--risk-low)"}
                />
                <MetricCard
                    label="Active Backlogs"
                    value={summary?.backlogs || 0}
                    unit="Papers"
                    icon={<Book size={20} />}
                    color={summary?.backlogs > 0 ? "var(--risk-high)" : "var(--text-muted)"}
                />
                <MetricCard
                    label="Risk Score"
                    value={summary?.risk_score || 0}
                    unit="Index"
                    icon={<TrendingUp size={20} />}
                    color={riskClass === 'high' ? 'var(--risk-high)' : (riskClass === 'medium' ? 'var(--risk-medium)' : 'var(--risk-low)')}
                />
            </div>

            <div className="course-section-title">
                <h3>My Enrolled Courses</h3>
                <span className="course-count-badge" style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {courses.length} Active
                </span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="student-course-grid">
                {courses.length === 0 && !loading && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                        <p>No courses assigned for this semester yet.</p>
                    </div>
                )}

                {courses.map((course, idx) => (
                    <div key={`${course.course_code}-${idx}`} className="course-card-premium">
                        <div className="course-card-header">
                            <div className="course-info">
                                <h4>{course.subject_name}</h4>
                                <span className="course-code-badge">{course.course_code}</span>
                            </div>
                            <div className="course-icon" style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: 'var(--accent-blue)' }}>
                                <Book size={20} />
                            </div>
                        </div>

                        <div className="course-stats-mini">
                            <div className={`mini-stat attendance ${course.attendance_percentage < 75 ? 'warning' : ''}`}>
                                <span className="label">Attendance</span>
                                <span className="value">{course.attendance_percentage}%</span>
                            </div>
                            <div className="mini-stat">
                                <span className="label">Internals</span>
                                <span className="value">{course.internal_marks || '-'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                                <CheckCircle size={14} color={course.attendance_percentage >= 75 ? 'var(--risk-low)' : 'var(--risk-high)'} />
                                {course.attendance_percentage >= 75 ? 'Eligible for Exams' : 'Low Attendance'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Simple Loading Spinner
const Spinner = () => (
    <div className="spinner" style={{
        width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #196ae5',
        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem'
    }}>
        <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
);

export default StudentDashboard;
