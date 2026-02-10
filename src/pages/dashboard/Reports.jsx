import { useState } from 'react'
import { FileText, Download, AlertCircle } from 'lucide-react'
import './Dashboard.css'

const Reports = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const downloadRiskReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5000/api/reports/risk')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      // Create a blob from the response
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EduPredict_Risk_Report_${new Date().toLocaleDateString('en-CA')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadPerformanceReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5000/api/reports/performance')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EduPredict_Performance_Report_${new Date().toLocaleDateString('en-CA')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Performance</p>
          <h2>Reports Generation</h2>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="dashboard-grid-2col">
        {/* Risk Report Card */}
        <div className="card">
          <div className="card-header">
            <h3>At-Risk Student Report</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div className="stat-icon" style={{ background: '#FEE2E2', color: '#EF4444', marginTop: '4px' }}>
                <FileText size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '8px', color: '#374151' }}>
                  Generates a detailed list of students identified as 'High Risk'. Includes risk scores,
                  attendance deficits, and backlog counts for immediate intervention.
                </p>
                <button
                  className="btn-primary"
                  onClick={downloadRiskReport}
                  disabled={loading}
                  style={{ marginTop: '12px' }}
                >
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      Download Risk Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Report Card */}
        <div className="card">
          <div className="card-header">
            <h3>Class Performance Report</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div className="stat-icon" style={{ background: '#DBEAFE', color: '#2563EB', marginTop: '4px' }}>
                <FileText size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '8px', color: '#374151' }}>
                  Comprehensive academic summary including class averages for SGPA and Attendance,
                  along with a full roster performance breakdown.
                </p>
                <button
                  className="btn-secondary"
                  onClick={downloadPerformanceReport}
                  disabled={loading}
                  style={{ marginTop: '12px' }}
                >
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      Download Academic Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Section (Placeholder) */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3>Recent Reports</h3>
        </div>
        <div className="card-body">
          <div className="empty-state" style={{ padding: '40px' }}>
            <FileText size={48} color="#9CA3AF" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#6B7280' }}>No reports generated recently in this session.</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              Downloaded reports are saved to your browser's default download location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
