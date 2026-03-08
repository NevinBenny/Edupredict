import toast from 'react-hot-toast'

export const confirmToast = (message, onConfirm) => {
    toast(
        (t) => (
            <div>
                <p style={{ margin: '0 0 12px 0', fontWeight: '500', color: '#1e293b' }}>{message}</p>
                <div style={{ display: 'flex', gap: '8px', Math: 'flex-end', justifyContent: 'flex-end' }}>
                    <button
                        className="secondary-btn"
                        style={{ padding: '6px 14px', fontSize: '0.875rem', minWidth: 'auto' }}
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Cancel
                    </button>
                    <button
                        className="primary-btn"
                        style={{ padding: '6px 14px', fontSize: '0.875rem', minWidth: 'auto' }}
                        onClick={() => {
                            toast.dismiss(t.id)
                            onConfirm()
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        ),
        {
            duration: Infinity,
            position: 'top-center',
        }
    )
}
