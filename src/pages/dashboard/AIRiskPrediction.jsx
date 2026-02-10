import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, Users, CheckCircle } from 'lucide-react'
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

  useEffect(() => {
    fetchAnalysis();
  }, []);

  if (loading) return <div className="dash-page"><div className="loading-spinner">Analyzing data...</div></div>;
  if (error) return <div className="dash-page"><div className="error-message">Error: {error} <button onClick={fetchAnalysis}>Retry</button></div></div>;

  const { summary, distribution, insights, high_risk_students } = data;

  return (
    <div className="dash-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">AI Powered Insights</p>
          <h2>Risk Analysis Dashboard</h2>
        </div>
        <button onClick={fetchAnalysis} className="btn-secondary">Refresh Analysis</button>
      </div>

      {/* Top Stats Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}><Users size={24} /></div>
          <div className="stat-info">
            <h3>{summary.total_students}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEE2E2', color: '#EF4444' }}><AlertTriangle size={24} /></div>
          <div className="stat-info">
            <h3>{summary.high_risk_count}</h3>
            <p>High Risk Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3>{summary.avg_risk_score}</h3>
            <p>Avg Risk Score</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2col" style={{ marginTop: '2rem' }}>
        {/* Left: AI Insights */}
        <div className="card">
          <div className="card-header">
            <h3>AI Insights</h3>
          </div>
          <div className="card-body">
            <ul className="insights-list">
              {insights.map((insight, idx) => (
                <li key={idx} className="insight-item">
                  <span className="bullet">•</span> {insight}
                </li>
              ))}
              {insights.length === 0 && <p>No specific insights generated.</p>}
            </ul>
          </div>
        </div>

        {/* Right: Risk Distribution Chart */}
        <div className="card">
          <div className="card-header">
            <h3>Risk Distribution</h3>
          </div>
          <div className="card-body" style={{ height: '300px' }}>
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: High Risk Students Table */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3>Students Requiring Attention</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
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
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>{student.department}</td>
                    <td>{student.attendance_percentage}%</td>
                    <td>
                      <span className="badge badge-high">{student.risk_score}</span>
                    </td>
                    <td>
                      <button className="btn-sm btn-outline">View Profile</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    <CheckCircle size={48} color="#10B981" style={{ marginBottom: '1rem' }} />
                    <p>Great job! No students are currently in the High Risk category.</p>
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
