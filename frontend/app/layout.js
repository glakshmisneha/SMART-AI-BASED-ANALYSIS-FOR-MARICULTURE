import './globals.css'

export const metadata = {
  title: 'Smart ORP Mariculture',
  description: 'AI-Based Advanced ORP Water Monitoring System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="dashboard-container">
          <header className="header">
            <div>
              <h1>SmartAqua AI</h1>
              <p style={{ color: 'var(--text-muted)' }}>Advanced Mariculture Monitoring System</p>
            </div>
            <nav className="nav-links">
              <a href="/">Dashboard</a>
              <a href="/reports">Reports & Alerts</a>
            </nav>
          </header>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
