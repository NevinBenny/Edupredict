import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    LogOut,
    GraduationCap,
    Clock,
    BookOpen,
    AlertTriangle,
    CheckCircle,
    Inbox,
    Sparkles,
    Calendar,
    ChevronRight
} from 'lucide-react';
import './Student.css';

const StudentHome = () => {
    const { user, logout } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                // Pass the email as a header so the backend can identify the student
                const response = await fetch('http://localhost:5000/api/student/my-data', {
                    headers: {
                        'X-User-Email': user?.email || '',
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Student record not found. Please contact administration.");
                    }
                    throw new Error("Failed to load academic data.");
                }

                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (user?.email) {
            fetchStudentData();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty-state">
                    <Sparkles className="spinner" size={32} />
                    <p>Loading your academic profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="dashboard-panel" style={{ maxWidth: 400, textAlign: 'center' }}>
                    <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
                    <h2 style={{ justifyContent: 'center' }}>Access Error</h2>
                    <p style={{ color: 'var(--c-text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn-primary" onClick={logout}>Return to Login</button>
                </div>
            </div>
        );
    }

    const { profile, academics, ai_insights, interventions } = data;

    // AI Status Configuration
    let statusConfig = {
        class: 'healthy',
        icon: <CheckCircle size={24} />,
        title: 'On Track',
        message: 'Great job! Your academic trajectory is looking solid. Keep up the good work and maintain your current attendance.'
    };

    if (ai_insights.risk_level === 'High') {
        statusConfig = {
            class: 'action-required',
            icon: <AlertTriangle size={24} />,
            title: 'Action Required',
            message: 'Your academic analytics indicate you might be falling behind. Please review your active tasks and consider reaching out to your faculty advisor.'
        };
    } else if (ai_insights.risk_level === 'Medium') {
        statusConfig = {
            class: 'warning',
            icon: <AlertTriangle size={24} />,
            title: 'Borderline Status',
            message: 'You are currently in a borderline zone. Focusing on improving your attendance or next internal assessment can quickly get you back on track.'
        };
    }

    return (
        <div className="student-dashboard">
            {/* Header */}
            <header className="student-header">
                <div className="profile-section">
                    <div className="avatar">
                        {profile.name.charAt(0)}
                    </div>
                    <div className="welcome-text">
                        <h1>Welcome back, {profile.name}</h1>
                        <p>{profile.student_id} • {profile.department} (Sem {profile.semester})</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="btn-secondary-action"
                    style={{ border: 'none', background: 'transparent' }}
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </header>

            {/* Main Content */}
            <main className="student-content">

                {/* Key Metrics */}
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon blue">
                            <Clock size={24} />
                        </div>
                        <div className="metric-info">
                            <h3>Attendance</h3>
                            <p className="value">{academics.attendance}%</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon green">
                            <GraduationCap size={24} />
                        </div>
                        <div className="metric-info">
                            <h3>SGPA</h3>
                            <p className="value">{academics.sgpa.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon purple">
                            <BookOpen size={24} />
                        </div>
                        <div className="metric-info">
                            <h3>Internal Marks</h3>
                            <p className="value">{academics.internal_marks} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ 50</span></p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon orange">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="metric-info">
                            <h3>Active Backlogs</h3>
                            <p className="value">{academics.backlogs}</p>
                        </div>
                    </div>
                </div>

                <div className="split-layout">
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* AI Insight Widget */}
                        <div className="dashboard-panel">
                            <h2><Sparkles size={20} color="#8b5cf6" /> AI Academic Assistant</h2>
                            <div className={`ai-status-widget ${statusConfig.class}`}>
                                <div className="status-header">
                                    {statusConfig.icon}
                                    {statusConfig.title}
                                </div>
                                <div className="status-body">
                                    {statusConfig.message}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interventions/Tasks */}
                    <div className="dashboard-panel">
                        <h2><Calendar size={20} /> My Tasks & Updates</h2>

                        {interventions.length === 0 ? (
                            <div className="empty-state">
                                <Inbox size={48} opacity={0.5} />
                                <p>You have no pending tasks or faculty messages.</p>
                            </div>
                        ) : (
                            <div className="intervention-list">
                                {interventions.map(task => (
                                    <div key={task.id} className={`intervention-item ${task.status.toLowerCase().replace(' ', '-')}`}>
                                        <div className="intervention-icon">
                                            {task.status === 'Completed' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                        </div>
                                        <div className="intervention-details">
                                            <h4>{task.title}</h4>
                                            {task.description && <p>{task.description}</p>}
                                            <div className="intervention-meta">
                                                <span>Status: <strong>{task.status}</strong></span>
                                                {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default StudentHome;
