import { useState } from 'react'
import { FileText, Download, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
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
      toast.error(`Error: ${err.message}`)
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
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dash-container">
      <div className="section-header">
        <div>
          <h3>Reports Generation</h3>
          <p>Download detailed insights and academic summaries</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="dashboard-grid-2col">
        {/* Risk Report Card */}
        <div className="card-panel">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3>At-Risk Student Report</h3>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div className="metric-icon-box" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                <FileText size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '16px', color: 'var(--c-text-secondary)', lineHeight: '1.5', fontSize: '14px' }}>
                  Generates a detailed list of students identified as 'High Risk'. Includes risk scores,
                  attendance deficits, and backlog counts for immediate intervention.
                </p>
                <button
                  className="btn-primary"
                  onClick={downloadRiskReport}
                  disabled={loading}
                >
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Risk Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Report Card */}
        <div className="card-panel">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h3>Class Performance Report</h3>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div className="metric-icon-box" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                <FileText size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: '16px', color: 'var(--c-text-secondary)', lineHeight: '1.5', fontSize: '14px' }}>
                  Comprehensive academic summary including class averages for SGPA and Attendance,
                  along with a full roster performance breakdown.
                </p>
                <button
                  className="btn-secondary-action"
                  onClick={downloadPerformanceReport}
                  disabled={loading}
                >
                  {loading ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download size={18} />
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
      <div className="card-panel">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3>Recent Reports</h3>
        </div>
        <div>
          <div className="empty-state-small" style={{ padding: '40px' }}>
            <FileText size={48} color="var(--c-text-tertiary)" style={{ marginBottom: '12px' }} />
            <p style={{ color: 'var(--c-text-secondary)' }}>No reports generated recently in this session.</p>
            <p style={{ fontSize: '13px', color: 'var(--c-text-tertiary)', marginTop: '4px' }}>
              Downloaded reports are saved to your browser's default download location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
