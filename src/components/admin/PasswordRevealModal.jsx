import { useState } from 'react'
import { Copy, Check, Download, X } from 'lucide-react'

/**
 * PasswordRevealModal
 * Shows newly generated credentials with copy + optional CSV download.
 *
 * Props:
 *   isOpen        - boolean
 *   onClose       - fn
 *   credentials   - { email, password } | null
 *   showCsvDownload - boolean (for batch / student)
 *   csvFilename   - string (default: "credentials.csv")
 *   credentialsList - array of { email, password } for CSV export (optional)
 */
const PasswordRevealModal = ({
    isOpen,
    onClose,
    credentials,
    showCsvDownload = false,
    csvFilename = 'credentials.csv',
    credentialsList = null,
}) => {
    const [copied, setCopied] = useState(false)

    if (!isOpen || !credentials) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(credentials.password)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownloadCsv = () => {
        const list = credentialsList || [credentials]
        const header = 'Email,Temporary Password\n'
        const rows = list.map((c) => `${c.email},${c.password}`).join('\n')
        const blob = new Blob([header + rows], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = csvFilename
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: 440 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>🔑 New Password Generated</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Email */}
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#6b7280' }}>Account</p>
                <p style={{ margin: '0 0 20px 0', fontWeight: 600, color: '#1e293b', fontSize: 15 }}>{credentials.email}</p>

                {/* Password box */}
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#6b7280' }}>Temporary Password</p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 12,
                }}>
                    <code style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', letterSpacing: 1 }}>
                        {credentials.password}
                    </code>
                    <button
                        onClick={handleCopy}
                        title="Copy password"
                        style={{
                            background: copied ? '#dcfce7' : 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            color: copied ? '#16a34a' : '#374151',
                            transition: 'all 0.15s',
                        }}
                    >
                        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                    </button>
                </div>

                <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#9ca3af' }}>
                    ⚠️ Save this now — it won't be shown again. The user will be forced to change it on first login.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                    {showCsvDownload && (
                        <button className="primary-btn" onClick={handleDownloadCsv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Download size={16} /> Download CSV
                        </button>
                    )}
                    <button className="secondary-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PasswordRevealModal
