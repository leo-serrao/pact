import { Outlet } from 'react-router-dom'
import Header from '../components/Header'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Header />

      <main
        className=" min-h-screen px-4 py-6 lg:ml-[260px] lg:px-8"
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <Outlet />
        </div>
      </main>

    </div>
  )
}