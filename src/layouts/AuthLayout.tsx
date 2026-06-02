import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">

      <main className="min-h-screen flex items-center justify-center p-6">
        <Outlet />
      </main>

    </div>
  )
}