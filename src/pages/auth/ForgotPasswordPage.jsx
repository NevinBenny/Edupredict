import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../services/api'
import { validateUserInput } from '../../utils/validation'
import toast from 'react-hot-toast'

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const onInput = (e) => {
        setEmail(e.target.value)
        if (error) setError('')
    }

    const onSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateUserInput({ email })
        if (validationErrors.email) {
            setError(validationErrors.email)
            return
        }

        setSubmitting(true)
        try {
            await requestPasswordReset(email)
            toast.success('If an account exists for that email, we have sent a reset link.')
            setEmail('')
        } catch (err) {
            toast.error(err.message || 'Unable to process request. Please try again later.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="form-field">
                <label htmlFor="email">Registered Email</label>
                <div className={`input-shell ${error ? 'has-error' : ''}`}>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@university.edu"
                        value={email}
                        onChange={onInput}
                        required
                    />
                </div>
                {error && <p className="input-error">{error}</p>}
            </div>

            <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? 'Sending Request...' : 'Send Reset Link'}
            </button>

            <p className="footnote">
                Remembered your password? <Link to="/auth/login">Back to login</Link>
            </p>
        </form>
    )
}

export default ForgotPasswordPage
