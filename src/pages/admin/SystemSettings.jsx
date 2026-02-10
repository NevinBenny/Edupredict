import { useState } from 'react'
import FormField from '../../components/admin/FormField'

/**
 * SystemSettings - Admin page for system configuration
 * Features:
 * - Default alert thresholds configuration
 * - Notification preferences
 * - Basic system configuration options
 * - Settings persistence (in production)
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
    <div className="admin-page">
      {/* Page Header */}
      <section className="page-header">
        <div className="header-content">
          <h2>System Settings</h2>
          <p className="header-subtitle">Configure academic thresholds, notifications, and system preferences</p>
        </div>
      </section>

      {/* Save Message */}
      {saveMessage && <div className="success-message">{saveMessage}</div>}

      {/* Settings Form */}
      <div className="settings-grid">
        {/* Academic Thresholds Section */}
        <section className="settings-section">
          <h3>Academic Thresholds</h3>
          <p className="section-description">Configure definitions for at-risk students</p>

          <div className="settings-subsection">
            <h4>Attendance Criteria</h4>
            <FormField
              label="Low Attendance Warning (%)"
              type="number"
              name="lowAttendanceThreshold"
              value={settings.lowAttendanceThreshold}
              onChange={(e) => handleSettingChange('lowAttendanceThreshold', Number(e.target.value))}
            />
            <p className="setting-help">Students below this attendance are flagged</p>
          </div>

          <div className="settings-subsection">
            <h4>Performance Criteria</h4>
            <FormField
              label="Minimum SGPA Threshold"
              type="number"
              name="lowSGPAThreshold"
              value={settings.lowSGPAThreshold}
              onChange={(e) => handleSettingChange('lowSGPAThreshold', Number(e.target.value))}
            />
            <p className="setting-help">Students below this SGPA are flagged</p>
          </div>

          <div className="settings-subsection">
            <h4>Risk Assessment</h4>
            <FormField
              label="High Risk Score Threshold"
              type="number"
              name="highRiskScoreThreshold"
              value={settings.highRiskScoreThreshold}
              onChange={(e) => handleSettingChange('highRiskScoreThreshold', Number(e.target.value))}
            />
            <p className="setting-help">Composite score above this is considered 'High Risk'</p>
          </div>
        </section>

        {/* Notification Preferences Section */}
        <section className="settings-section">
          <h3>Notification Preferences</h3>
          <p className="section-description">Control how notifications are sent to users</p>

          <div className="settings-subsection">
            <div className="setting-toggle">
              <label htmlFor="emailNotifications">
                <input
                  id="emailNotifications"
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
                <span>Enable Email Notifications</span>
              </label>
              <p className="setting-help">Send alerts to users via email</p>
            </div>

            <div className="setting-toggle">
              <label htmlFor="smsNotifications">
                <input
                  id="smsNotifications"
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                />
                <span>Enable SMS Notifications</span>
              </label>
              <p className="setting-help">Send critical alerts via SMS</p>
            </div>

            <div className="setting-toggle">
              <label htmlFor="pushNotifications">
                <input
                  id="pushNotifications"
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                />
                <span>Enable Push Notifications</span>
              </label>
              <p className="setting-help">Send notifications to user devices</p>
            </div>
          </div>

          <div className="settings-subsection">
            <h4>Notification Delay</h4>
            <FormField
              label="Alert Notification Delay (minutes)"
              type="number"
              name="notificationDelay"
              value={settings.notificationDelay}
              onChange={(e) => handleSettingChange('notificationDelay', Number(e.target.value))}
            />
            <p className="setting-help">Wait before sending duplicate alerts for same issue</p>
          </div>
        </section>

        {/* System Configuration Section */}
        <section className="settings-section">
          <h3>System Configuration</h3>
          <p className="section-description">General system settings and maintenance options</p>

          <div className="settings-subsection">
            <div className="setting-toggle">
              <label htmlFor="maintenanceMode">
                <input
                  id="maintenanceMode"
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                />
                <span>Maintenance Mode</span>
              </label>
              <p className="setting-help">Disable system access for scheduled maintenance</p>
            </div>

            <div className="setting-toggle">
              <label htmlFor="autoBackup">
                <input
                  id="autoBackup"
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                />
                <span>Enable Automatic Backups</span>
              </label>
              <p className="setting-help">Regularly backup database and files</p>
            </div>
          </div>

          <div className="settings-subsection">
            <h4>Backup Configuration</h4>
            <div className="form-group">
              <label htmlFor="backupFrequency">Backup Frequency</label>
              <select
                id="backupFrequency"
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

          <div className="settings-subsection">
            <h4>Session Management</h4>
            <FormField
              label="Session Timeout (minutes)"
              type="number"
              name="sessionTimeout"
              value={settings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', Number(e.target.value))}
            />
            <p className="setting-help">Automatically logout users after inactivity</p>
          </div>
        </section>
      </div>

      {/* Save Button */}
      <section className="page-actions">
        <button
          className="primary-btn"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </section>
    </div>
  )
}

export default SystemSettings
