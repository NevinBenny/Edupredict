import { useState } from 'react'
import { FileText, Download, AlertCircle, Clock, ShieldAlert, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import './Dashboard.css'

const Reports = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionReports, setSessionReports] = useState([])

  const trackReport = (name) => {
    const newReport = {
      id: Date.now(),
      name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setSessionReports(prev => [newReport, ...prev])
  }

  const downloadReport = async (type) => {
    setLoading(type)
    setError(null)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
    // Remove the leading '/api' since baseUrl already contains it
    const endpoint = type === 'risk' ? '/reports/risk' : '/reports/performance'
    const fileName = type === 'risk' ? 'Risk_Report' : 'Academic_Summary'

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate report')
        } else {
          throw new Error(`Server Error (${response.status}): The backend is unreachable or crashed.`)
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EduPredict_${fileName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      trackReport(type === 'risk' ? 'At-Risk Student Roster' : 'Academic Performance Summary')
      toast.success('Report downloaded successfully')
    } catch (err) {
      setError(err.message)
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-page minimal-theme">
      <div className="page-header" style={{ border: 'none', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Academic Intelligence</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Generate and manage institutional academic reports.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', borderRadius: '12px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="report-grid-minimal">
        {/* Risk Report Card */}
        <div className="report-card-minimal risk">
          <div className="report-type-badge">Action Required</div>
          <div>
            <h3>At-Risk Roster</h3>
            <p>A high-priority list of students identified as 'High Risk'. Includes participation deficits and backlog counts.</p>
          </div>
          <button
            className="btn-report-minimal primary"
            onClick={() => downloadReport('risk')}
            disabled={loading === 'risk'}
          >
            {loading === 'risk' ? 'Generating...' : <><Download size={18} /> Download List</>}
          </button>
        </div>

        {/* Performance Report Card */}
        <div className="report-card-minimal performance">
          <div className="report-type-badge">Overview</div>
          <div>
            <h3>Academic Summary</h3>
            <p>Comprehensive summary including class averages for SGPA and Attendance, plus a full performance breakdown.</p>
          </div>
          <button
            className="btn-report-minimal secondary"
            onClick={() => downloadReport('performance')}
            disabled={loading === 'performance'}
          >
            {loading === 'performance' ? 'Generating...' : <><BarChart3 size={18} /> Download Summary</>}
          </button>
        </div>
      </div>

      <div className="report-session-log">
        <div className="log-header">
          <Clock size={16} color="#64748b" />
          <h4>Session Downloads</h4>
        </div>

        {sessionReports.length > 0 ? (
          <div>
            {sessionReports.map(report => (
              <div key={report.id} className="report-activity-item">
                <div className="activity-icon-dot"></div>
                <div className="activity-info">
                  <span className="activity-name">{report.name}</span>
                  <span className="activity-time">{report.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            No reports generated in this session yet.
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports
