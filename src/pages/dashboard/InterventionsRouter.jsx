import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Interventions from './Interventions';
import StudentInterventions from './StudentInterventions';

const InterventionsRouter = () => {
    const { user } = useAuth();
    const role = user?.role || 'STUDENT';

    if (role === 'FACULTY' || role === 'ADMIN') {
        return <Interventions />;
    } else {
        return <StudentInterventions />;
    }
};

export default InterventionsRouter;
