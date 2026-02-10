
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { forcePasswordChange } from '../../services/api'
import './authpages.css'

const ChangePasswordPage = () => {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            await forcePasswordChange(password)

            alert('Password updated successfully. Please log in again.')
            await logout()
            navigate('/auth/login')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Change Password</h2>
                    <p className="subtitle">You must change your password before continuing.</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="form-field">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    {error && <div className="status-text status-error">{error}</div>}

                    <button type="submit" className="primary-btn" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button type="button" className="text-btn" onClick={logout}>
                            Cancel (Logout)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ChangePasswordPage
