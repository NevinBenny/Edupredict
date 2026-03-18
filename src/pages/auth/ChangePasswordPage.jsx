import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { forcePasswordChange } from '../../services/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import './authpages.css'

const ChangePasswordPage = () => {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            await forcePasswordChange(password)
            toast.success('Password updated! Logging you out...')
            setTimeout(async () => {
                await logout()
                navigate('/auth/login')
            }, 1500)
        } catch (err) {
            toast.error(err.message || 'Failed to update password')
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
                        <div className="input-shell">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={showPassword ? 'password-input' : ''}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Confirm Password</label>
                        <div className="input-shell">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className={showConfirmPassword ? 'password-input' : ''}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

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
