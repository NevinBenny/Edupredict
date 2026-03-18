import { useLocation } from 'react-router-dom'
import heroImage from '../../assets/edu.png'
import icon from '../../assets/icon.png'
import './authpages.css'

const AuthLayout = ({ children, heading }) => {
  const location = useLocation()
  const isLogin =
    location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/auth/login'

  return (
    <div className="auth-shell">
      <div className="hero-side">
        <img src={heroImage} alt="Educational AI" />
        <div className="hero-copy">
          <p className="hero-title">EduPredict</p>
          <p className="hero-sub">Empowering education through AI-powered academic performance prediction and insights.</p>
        </div>
      </div>

      <div className="form-side">

        <div className="auth-card">
          <div className="brand-row">
            <img src={icon} alt="EduPredict" style={{ width: '32px', height: '32px' }} />
            <span className="brand-name">EduPredict</span>
          </div>
          <div className="intro">
            <h2>{heading || (isLogin ? 'Welcome back' : 'Join EduPredict')}</h2>
            <p className="sub-text">Please enter your details to continue.</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
