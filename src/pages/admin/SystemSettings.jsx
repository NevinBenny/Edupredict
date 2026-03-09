import { useState } from 'react'
import FormField from '../../components/admin/FormField'
import './AdminPanel.css'

/**
 * SystemSettings - Admin page for system configuration
 */
const SystemSettings = () => {
  // Mock settings data - Replace with API calls in production
  const [settings, setSettings] = useState({
    // Academic Thresholds
    lowAttendanceThreshold: 75,
    lowSGPAThreshold: 6.0,
    highRiskScoreThreshold: 70,

    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notificationDelay: 5,

    // System Settings
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily',
    sessionTimeout: 30,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setSaveMessage('Settings saved successfully!')
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }, 500)
  }

  return (
    <div className="dash-container minimal">
      <div className="section-header">
        <div>
          <h3>System Settings</h3>
          <p>Configure academic thresholds, notifications, and system preferences</p>
        </div>
      </div>

      {saveMessage && <div className="alert alert-success">{saveMessage}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* Academic Thresholds Section */}
        <div className="card-panel">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--c-text-primary)' }}>Academic Thresholds</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <FormField
                label="Low Attendance Warning (%)"
                type="number"
                name="lowAttendanceThreshold"
                value={settings.lowAttendanceThreshold}
                onChange={(e) => handleSettingChange('lowAttendanceThreshold', Number(e.target.value))}
              />
              <p style={{ fontSize: '12px', color: 'var(--c-text-tertiary)', marginTop: '4px' }}>Students below this attendance are flagged</p>
            </div>

            <div className="form-group">
              <FormField
                label="Minimum SGPA Threshold"
                type="number"
                name="lowSGPAThreshold"
                value={settings.lowSGPAThreshold}
                onChange={(e) => handleSettingChange('lowSGPAThreshold', Number(e.target.value))}
              />
              <p style={{ fontSize: '12px', color: 'var(--c-text-tertiary)', marginTop: '4px' }}>Students below this SGPA are flagged</p>
            </div>

            <div className="form-group">
              <FormField
                label="High Risk Score Threshold"
                type="number"
                name="highRiskScoreThreshold"
                value={settings.highRiskScoreThreshold}
                onChange={(e) => handleSettingChange('highRiskScoreThreshold', Number(e.target.value))}
              />
              <p style={{ fontSize: '12px', color: 'var(--c-text-tertiary)', marginTop: '4px' }}>Composite score above this is 'High Risk'</p>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="card-panel">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--c-text-primary)' }}>Notification Preferences</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="settings-subsection">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                  <span>Enable Email Notifications</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                  />
                  <span>Enable SMS Notifications</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                  <span>Enable Push Notifications</span>
                </label>
              </div>
            </div>

            <div className="settings-subsection">
              <FormField
                label="Alert Notification Delay (minutes)"
                type="number"
                name="notificationDelay"
                value={settings.notificationDelay}
                onChange={(e) => handleSettingChange('notificationDelay', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* System Configuration Section */}
        <div className="card-panel">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--c-text-primary)' }}>System Configuration</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                />
                <span>Maintenance Mode</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                />
                <span>Enable Automatic Backups</span>
              </label>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--c-text-secondary)' }}>Backup Frequency</label>
              <div className="select-wrapper">
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                  className="form-input"
                  disabled={!settings.autoBackup}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <FormField
                label="Session Timeout (minutes)"
                type="number"
                name="sessionTimeout"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-primary"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default SystemSettings
