import React, { useEffect, useState } from 'react';
import './DashboardHome.css';
import MetricCard from './MetricCard';
import StatDonutChart from './StatDonutChart';
import StudentTable from './StudentTable';
import AddStudentModal from './AddStudentModal';
import RiskDrillDownModal from './RiskDrillDownModal';
import { Users, Clock, GraduationCap, AlertTriangle, UserPlus, Play, FileUp } from 'lucide-react';

const DashboardHome = () => {
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(null);

  const fetchData = async () => {
    try {
      const [summaryRes, distRes, studentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/dashboard/summary').then(res => res.json()),
        fetch('http://localhost:5000/api/dashboard/risk-distribution').then(res => res.json()),
        fetch('http://localhost:5000/api/students').then(res => res.json())
      ]);

      setSummary(summaryRes);
      setDistribution(distRes);
      setStudents(studentsRes.students);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <p>Syncing faculty records...</p>
      </div>
    );
  }

  return (
    <div className="dash-container minimal">
      {/* 1. Top Summary Cards */}
      <div className="stats-grid single-row">
        <MetricCard
          label="Total Students"
          value={summary?.total_students}
          icon={<Users size={16} />}
          color="#3b82f6"
        />
        <MetricCard
          label="Avg Attendance"
          value={summary?.avg_attendance}
          unit="%"
          icon={<Clock size={16} />}
          trend="up"
          trendValue="+1.2%"
          color="#10b981"
        />
        <MetricCard
          label="Avg SGPA"
          value={summary?.avg_sgpa}
          icon={<GraduationCap size={16} />}
          trend="up"
          trendValue="+0.15"
          color="#6366f1"
        />
        <MetricCard
          label="High Risk"
          value={summary?.high_risk_students}
          icon={<AlertTriangle size={16} />}
          trend="down"
          trendValue="-2"
          color="#ef4444"
        />
      </div>

      {/* 2. Faculty Actions Area */}
      <div className="faculty-actions-bar">
        <div className="action-group">
          <button className="btn-action pulse">
            <Play size={16} />
            Run Risk Prediction
          </button>
        </div>
        <div className="action-group">
          <button className="btn-secondary-action">
            <FileUp size={16} />
            Import CSV
          </button>
          <button className="btn-secondary-action" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            Add Student
          </button>
        </div>
      </div>

      <div className="main-content-split">
        {/* 4. Student Records Table (Primary Focus) */}
        <div className="primary-section">
          <div className="section-header">
            <h3>Student Academic Records</h3>
            <p>Managing {students.length} students for the current semester</p>
          </div>
          <StudentTable students={students} />
        </div>

        {/* 3. Risk Visualization (Secondary) */}
        <div className="secondary-section">
          <div className="section-header">
            <h3>Risk Distribution</h3>
          </div>
          <div className="risk-chart-box">
            <StatDonutChart
              data={distribution || []}
              centerText={`${summary?.total_students}`}
              onSegmentClick={(level) => setSelectedRiskLevel(level)}
            />
            <p className="chart-sub">Click a segment to view students</p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onStudentAdded={fetchData}
        />
      )}

      {selectedRiskLevel && (
        <RiskDrillDownModal
          riskLevel={selectedRiskLevel}
          students={students}
          onClose={() => setSelectedRiskLevel(null)}
        />
      )}
    </div>
  );
};

export default DashboardHome;
