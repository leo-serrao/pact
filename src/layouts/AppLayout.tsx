import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import { usePushSubscription } from '../hooks/usePushSubscription'

export default function AppLayout() {
  const { user } = useAuth()
  const { ensureSubscribed } = usePushSubscription()

  useEffect(() => {
    if (user) ensureSubscribed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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