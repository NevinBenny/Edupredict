import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../services/api'
import { validateUserInput } from '../../utils/validation'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [token, setToken] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const urlToken = search.get('token') || ''
    setToken(urlToken)
  }, [search])

  const onInput = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Reset link is missing or invalid.')
      return
    }

    const validation = validateUserInput({ password: form.password, confirmPassword: form.confirmPassword })
    if (Object.keys(validation).length) {
      setErrors(validation)
      return
    }

    setSubmitting(true)
    try {
      const result = await resetPassword({ token, password: form.password, confirmPassword: form.confirmPassword })
      toast.success(result?.message || 'Password updated! Redirecting to login…')
      setTimeout(() => navigate('/auth/login', { replace: true }), 1500)
    } catch (err) {
      toast.error(err.message || 'Unable to reset password right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-heading">
        {/* Header managed by AuthLayout */}
      </div>

      <div className="form-field">
        <label htmlFor="password">New Password</label>
        <div className={`input-shell ${errors.password ? 'has-error' : ''}`}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className={showPassword ? 'password-input' : ''}
            placeholder="Enter new password"
            value={form.password}
            onChange={onInput}
            aria-invalid={Boolean(errors.password)}
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
        {errors.password ? <p className="input-error">{errors.password}</p> : null}
      </div>

      <div className="form-field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className={`input-shell ${errors.confirmPassword ? 'has-error' : ''}`}>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            className={showConfirmPassword ? 'password-input' : ''}
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={onInput}
            aria-invalid={Boolean(errors.confirmPassword)}
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
        {errors.confirmPassword ? <p className="input-error">{errors.confirmPassword}</p> : null}
      </div>

      <button className="primary-btn" type="submit" disabled={submitting}>
        {submitting ? 'Updating…' : 'Update Password'}
      </button>

      <p className="footnote">
        Remembered your password? <Link to="/auth/login">Back to login</Link>
      </p>
    </form>
  )
}

export default ResetPasswordPage
