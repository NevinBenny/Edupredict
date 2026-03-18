import React, { useEffect, useState } from 'react';
import './DashboardHome.css';
import MetricCard from './MetricCard';
import StatDonutChart from './StatDonutChart';

import AddStudentModal from './AddStudentModal';
import RiskDrillDownModal from './RiskDrillDownModal';
import { Users, Clock, GraduationCap, AlertTriangle, UserPlus, Play, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardHome = () => {
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [students, setStudents] = useState([]);
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, distRes, studentsRes, profileRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/dashboard/summary`, { credentials: 'include' }).then(res => res.json()),
        fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/dashboard/risk-distribution`, { credentials: 'include' }).then(res => res.json()),
        fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/students`, { credentials: 'include' }).then(res => res.json()),
        fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/dashboard/faculty-profile`, { credentials: 'include' }).then(res => res.json())
      ]);

      if (summaryRes.error) {
        console.error('Summary error:', summaryRes.error);
      } else {
        setSummary(summaryRes);
      }

      if (Array.isArray(distRes)) {
        setDistribution(distRes);
      } else if (distRes && !distRes.error) {
        setDistribution(distRes);
      }

      if (studentsRes && Array.isArray(studentsRes.students)) {
        setStudents(studentsRes.students);
      }

      if (profileRes && !profileRes.error) {
        setFacultyProfile(profileRes);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunPrediction = async () => {
    const loader = toast.loading('AI Engine warming up...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/ai/predict`, { credentials: 'include' });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      toast.success('Risk Analysis Updated!', { id: loader });
      // Refresh to show newly calculated risk weights
      fetchData();

      if (data.insights && data.insights.length > 0) {
        toast(data.insights[0], { icon: '💡', duration: 6000 });
      }
    } catch (error) {
      toast.error('Prediction Engine failed: ' + error.message, { id: loader });
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loader = toast.loading('Importing students...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/students/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Import failed');

      toast.success(data.message, { id: loader });
      fetchData();
    } catch (error) {
      toast.error(error.message, { id: loader });
    }
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <p>Syncing faculty records...</p>
      </div>
    );
  }

  return (
    <div className="dash-page">
      {/* Welcome Banner */}
      <div className="faculty-welcome-banner">
        <div className="welcome-text">
          <p className="welcome-eyebrow">Dashboard Overview</p>
          <h2 className="welcome-greeting">Welcome back, {facultyProfile?.name || 'Faculty Member'}</h2>
          <p className="welcome-sub">
            Monitoring the <span className="highlight">{facultyProfile?.department || 'N/A'}</span> department performance and risk trends.
          </p>
        </div>
      </div>

      {/* 1. Top Summary Cards */}
      <div className="kpi-row">
        <MetricCard
          label="Total Students"
          value={summary?.total_students}
          icon={<Users size={20} />}
          color="var(--c-accent-primary)"
        />
        <MetricCard
          label="Avg Attendance"
          value={summary?.avg_attendance}
          unit="%"
          icon={<Clock size={20} />}
          trend="up"
          trendValue="+1.2%"
          color="var(--c-status-safe)"
        />
        <MetricCard
          label="Avg SGPA"
          value={summary?.avg_sgpa}
          icon={<GraduationCap size={20} />}
          trend="up"
          trendValue="+0.15"
          color="#6366f1"
        />
        <MetricCard
          label="High Risk"
          value={summary?.high_risk_students}
          icon={<AlertTriangle size={20} />}
          trend="down"
          trendValue="-2"
          color="var(--c-status-danger)"
        />
      </div>

      {/* 2. Faculty Actions Area */}
      <div className="faculty-actions-bar">
        <div className="action-group">
          <button className="btn-primary" onClick={handleRunPrediction}>
            <Play size={18} fill="currentColor" />
            Run Risk Prediction
          </button>
        </div>
        <div className="action-group">
          <input
            type="file"
            id="csv-import"
            hidden
            accept=".csv"
            onChange={handleImportCSV}
          />
          <button className="btn-secondary-action" onClick={() => document.getElementById('csv-import').click()}>
            <FileUp size={18} />
            Import CSV
          </button>
          <button className="btn-secondary-action" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            Add Student
          </button>
        </div>
      </div>

      <div className="dashboard-content-grid">
        {/* 3. Risk Visualization (Secondary) */}
        <div className="secondary-section">
          <div className="section-header">
            <h3>Risk Distribution</h3>
          </div>
          <div className="risk-chart-box">
            <StatDonutChart
              data={distribution || []}
              centerText={`${summary?.total_students || 0}`}
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
