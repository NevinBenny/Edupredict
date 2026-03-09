import React, { useEffect, useState } from 'react';
import './DashboardHome.css';
import MetricCard from './MetricCard';
import StatDonutChart from './StatDonutChart';
import StudentTable from './StudentTable';
import AddStudentModal from './AddStudentModal';
import RiskDrillDownModal from './RiskDrillDownModal';
import { Users, Clock, GraduationCap, AlertTriangle, UserPlus, Play, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardHome = () => {
  const [summary, setSummary] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, distRes, studentsRes] = await Promise.all([
        fetch('http://localhost:5000/api/dashboard/summary', { credentials: 'include' }).then(res => res.json()),
        fetch('http://localhost:5000/api/dashboard/risk-distribution', { credentials: 'include' }).then(res => res.json()),
        fetch('http://localhost:5000/api/students', { credentials: 'include' }).then(res => res.json())
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
      const res = await fetch('http://localhost:5000/api/ai/predict', { credentials: 'include' });
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
      const res = await fetch('http://localhost:5000/api/students/import', {
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
          <button className="btn-action pulse" onClick={handleRunPrediction}>
            <Play size={16} />
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
