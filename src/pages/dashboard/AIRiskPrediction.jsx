import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, Users, CheckCircle, BrainCircuit } from 'lucide-react'
import './Dashboard.css'

const AIRiskPrediction = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/ai/predict');
      if (!response.ok) throw new Error('Failed to fetch analysis');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/ai/run-predictions', {
        method: 'POST',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to run ML predictions');
      }
      // Re-fetch the updated data to refresh charts
      await fetchAnalysis();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  if (loading) return <div className="dash-loading"><div className="loading-spinner"></div><p>Analyzing student data...</p></div>;
  if (error) return (
    <div className="dash-container">
      <div className="alert alert-error">
        <AlertTriangle size={18} />
        <span>Error: {error}</span>
        <button onClick={fetchAnalysis} className="btn-sm btn-outline" style={{ marginLeft: 'auto' }}>Retry</button>
      </div>
    </div>
  );

  const { summary, distribution, insights, high_risk_students } = data;

  return (
    <div className="dash-container">
      <div className="section-header">
        <div>
          <h3>AI Powered Insights</h3>
          <p>Risk analysis and predictive modeling</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAnalysis} className="btn-secondary-action">
            <TrendingUp size={16} /> Refresh
          </button>
          <button onClick={runPredictions} className="primary-btn" style={{ margin: 0, padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BrainCircuit size={16} /> Run AI Diagnostics
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="stats-grid">
        <div className="card-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Students</span>
            <div className="metric-icon-box" style={{ background: '#E0F2FE', color: '#0284C7' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="metric-value">{summary.total_students}</div>
          <div className="metric-trend up">
            <span className="trend-label">Active enrollment</span>
          </div>
        </div>

        <div className="card-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">High Risk</span>
            <div className="metric-icon-box" style={{ background: '#FEE2E2', color: '#EF4444' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--c-status-danger)' }}>{summary.high_risk_count}</div>
          <div className="metric-trend down">
            <span className="trend-label">Require attention</span>
          </div>
        </div>

        <div className="card-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg Risk Score</span>
            <div className="metric-icon-box" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-value">{summary.avg_risk_score}</div>
          <div className="metric-trend">
            <span className="trend-label">Overall class health</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2col">
        {/* Left: AI Insights */}
        <div className="card-panel">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3>AI Insights</h3>
          </div>
          <div>
            <ul className="alert-list" style={{ gap: '12px' }}>
              {insights.map((insight, idx) => (
                <li key={idx} className="alert-item" style={{ alignItems: 'flex-start' }}>
                  <div className="alert-icon" style={{ color: 'var(--c-accent-primary)', marginTop: '2px' }}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="alert-content">
                    <p style={{ fontWeight: '400', fontSize: '14px', lineHeight: '1.5' }}>{insight}</p>
                  </div>
                </li>
              ))}
              {insights.length === 0 && <p className="text-secondary">No specific insights generated.</p>}
            </ul>
          </div>
        </div>

        {/* Right: Risk Distribution Chart */}
        <div className="card-panel">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3>Risk Distribution</h3>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: High Risk Students Table */}
      <div className="card-panel">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h3>Students Requiring Attention</h3>
        </div>
        <div className="table-card-panel">
          <table className="student-table modern">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Attendance</th>
                <th>Risk Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {high_risk_students.length > 0 ? (
                high_risk_students.map(student => (
                  <tr key={student.student_id}>
                    <td className="font-mono text-sm">{student.student_id}</td>
                    <td className="font-semibold">{student.name}</td>
                    <td><span className="text-sm">{student.department}</span></td>
                    <td>
                      <div className="progress-bar-cell">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span>{student.attendance_percentage}%</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${student.attendance_percentage}%`,
                              background: student.attendance_percentage < 75 ? 'var(--c-status-danger)' : 'var(--c-status-safe)'
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill high">{student.risk_score}</span>
                    </td>
                    <td>
                      <button className="btn-sm btn-outline">View Profile</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="empty-state-small" style={{ background: 'transparent' }}>
                      <CheckCircle size={48} color="var(--c-status-safe)" style={{ marginBottom: '1rem' }} />
                      <p>Great job! No students are currently in the High Risk category.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AIRiskPrediction
