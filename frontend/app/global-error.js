'use client'

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 20 }}>
          <h1 style={{ fontSize: 48, fontWeight: 'bold', color: '#dc2626', marginBottom: 16 }}>Error</h1>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ background: '#0c7792', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
