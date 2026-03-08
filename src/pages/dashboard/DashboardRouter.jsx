import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardHome from './DashboardHome';
import StudentDashboard from './StudentDashboard';

const DashboardRouter = () => {
    const { user } = useAuth();

    // In our app, the role is typically stored in user.role
    // Fallback to STUDENT just in case
    const role = user?.role || 'STUDENT';

    if (role === 'FACULTY') {
        return <DashboardHome />;
    } else {
        return <StudentDashboard />;
    }
};

export default DashboardRouter;
