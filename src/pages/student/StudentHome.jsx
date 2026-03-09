import { useAuth } from '../../context/AuthContext'

/**
 * Student Home — placeholder page.
 * A full student dashboard will be built in a future iteration.
 */
const StudentHome = () => {
    const { user, logout } = useAuth()

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--c-bg-app, #0f172a)',
            color: 'var(--c-text-primary, #e2e8f0)',
            fontFamily: 'var(--font-primary, Inter, sans-serif)',
            gap: '1rem',
            textAlign: 'center',
            padding: '2rem',
        }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
            }}>
                {user?.email?.charAt(0)?.toUpperCase() ?? 'S'}
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                Welcome, {user?.email?.split('@')[0] ?? 'Student'}!
            </h1>
            <p style={{ color: 'var(--c-text-secondary, #94a3b8)', maxWidth: 420 }}>
                The student dashboard is coming soon. Your academic performance insights
                will be available here once this feature is ready.
            </p>

            <button
                onClick={logout}
                style={{
                    marginTop: '1rem',
                    padding: '0.6rem 1.5rem',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Logout
            </button>
        </div>
    )
}

export default StudentHome
