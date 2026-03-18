import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { handleLogin } from '../../services/api'
import { validateUserInput } from '../../utils/validation'
import { Eye, EyeOff } from 'lucide-react'

const AdminLoginPage = () => {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [form, setForm] = useState({ email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [status, setStatus] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const onInput = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        setStatus(null)

        const validationErrors = validateUserInput(form)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        setSubmitting(true)
        try {
            const data = await handleLogin(form)

            if (data.user.role !== 'ADMIN') {
                throw new Error('Access denied. Admin credentials required.')
            }

            login(data.user)
            if (data.token) {
                localStorage.setItem('token', data.token)
            }

            setStatus({ type: 'success', message: 'Admin access granted. Redirecting...' })
            setTimeout(() => navigate('/admin'), 1000)
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Login failed.' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="form-field">
                <label htmlFor="email">Admin Email</label>
                <div className={`input-shell ${errors.email ? 'has-error' : ''}`}>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="admin@university.edu"
                        value={form.email}
                        onChange={onInput}
                        required
                    />
                </div>
                {errors.email && <p className="input-error">{errors.email}</p>}
            </div>

            <div className="form-field">
                <label htmlFor="password">Password</label>
                <div className={`input-shell ${errors.password ? 'has-error' : ''}`}>
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={showPassword ? 'password-input' : ''}
                        placeholder="Enter admin password"
                        value={form.password}
                        onChange={onInput}
                        required
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
                {errors.password && <p className="input-error">{errors.password}</p>}
            </div>

            {status && (
                <div className={`status-text ${status.type === 'success' ? 'status-success' : 'status-error'}`}>
                    {status.message}
                </div>
            )}

            <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? 'Authenticating...' : 'Elevated Sign In'}
            </button>

            <p className="footnote">
                Not an admin? <Link to="/auth/login">Standard Login</Link>
            </p>
        </form>
    )
}

export default AdminLoginPage
