/**
 * GlobalLoader - Suspense fallback & route loading indicator
 * Used inside <Suspense> boundaries to give feedback during code-split chunk loading.
 */
export default function GlobalLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-body)',
      gap: '20px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '4px solid var(--border-color)',
        borderTopColor: 'var(--saffron)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '0.9rem',
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
      }}>
        Loading PS-CRM
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


