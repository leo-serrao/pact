import React, { useState, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, Wallet, PiggyBank,
  Users, BarChart3, Settings, LogOut,
  Moon, Sun, Menu, X, Bell,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFinanceStore } from '../store/useFinanceStore'
import { useTheme } from '../contexts/ThemeContext'
import { useNotifications } from '../hooks/useNotifications'
import NotificationPanel from './NotificationPanel'

export default function Header() {
  const { user, logout } = useAuth()
  const { profile } = useFinanceStore()
  const { theme, toggle } = useTheme()
  const { notifications, unreadCount, hasRead, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = useNotifications()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Refs for trigger positioning
  const desktopBellRef = useRef<HTMLButtonElement>(null)
  const mobileBellRef = useRef<HTMLButtonElement>(null)
  const activeBellRef = useRef<HTMLElement | null>(null) as React.MutableRefObject<HTMLElement | null>

  function openNotif(ref: React.RefObject<HTMLButtonElement>) {
    activeBellRef.current = ref.current
    setNotifOpen(v => !v)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) => `
    group flex items-center gap-3 rounded-2xl px-4 py-3
    text-sm font-medium transition-all duration-200
    ${isActive
      ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
    }
  `

  const mobileNavItemClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-3 rounded-2xl px-4 py-3
    text-sm font-medium transition-all duration-200
    ${isActive
      ? 'bg-[var(--primary)] text-white'
      : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'
    }
  `

  function BellIcon() {
    return (
      <div className="relative">
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="
        fixed left-0 top-0 z-40
        hidden h-screen w-[260px] lg:flex
        flex-col border-r border-[var(--border)] bg-[var(--surface)]
      ">
        <div className="border-b border-[var(--divider)] p-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/no_text_logo.png" alt="PACT" className="h-11 w-11 object-contain" />
            <div>
              <h2 className="mt-1 text-xs text-[var(--text-primary)]">PACT</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Finanças a dois</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-1">
            <NavLink to="/" className={navItemClass}><LayoutDashboard size={18} strokeWidth={1.8} />Dashboard</NavLink>
            <NavLink to="/fixed" className={navItemClass}><Receipt size={18} strokeWidth={1.8} />Gastos Fixos</NavLink>
            <NavLink to="/variable" className={navItemClass}><Wallet size={18} strokeWidth={1.8} />Variáveis</NavLink>
            <NavLink to="/boxes" className={navItemClass}><PiggyBank size={18} strokeWidth={1.8} />Caixinhas</NavLink>
            <NavLink to="/shared" className={navItemClass}><Users size={18} strokeWidth={1.8} />Compartilhados</NavLink>
            <NavLink to="/reports" className={navItemClass}><BarChart3 size={18} strokeWidth={1.8} />Relatórios</NavLink>
          </nav>
        </div>

        <div className="border-t border-[var(--divider)] p-4">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
              {(profile?.displayName ?? user?.email ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{profile?.displayName ?? 'Usuário'}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-1">
            <button
              ref={desktopBellRef}
              onClick={() => openNotif(desktopBellRef)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            >
              <BellIcon />
              Notificações
              {unreadCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-medium">
                  {unreadCount}
                </span>
              )}
            </button>

            <Link to="/settings" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
              <Settings size={18} strokeWidth={1.8} />Configurações
            </Link>
            <button onClick={toggle} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#C96B6B] transition hover:bg-red-50 dark:hover:bg-red-950/20">
              <LogOut size={18} strokeWidth={1.8} />Sair
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-40 lg:hidden border-b border-[var(--border)] bg-[rgba(245,246,244,0.92)] backdrop-blur-xl dark:bg-[rgba(16,19,18,0.92)]">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/text_logo.png" alt="PACT" className="h-9 w-9 object-contain" />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Finanças a dois</p>
          </Link>

          <div className="flex items-center gap-2">
            <button
              ref={mobileBellRef}
              onClick={() => openNotif(mobileBellRef)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
            >
              <BellIcon />
            </button>
            <button onClick={toggle} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
            </button>
            <button onClick={() => setMobileOpen(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {mobileOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--divider)] bg-[var(--bg)]">
            <div className="space-y-2 p-4">
              <NavLink to="/" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><LayoutDashboard size={18} strokeWidth={1.8} />Dashboard</NavLink>
              <NavLink to="/fixed" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><Receipt size={18} strokeWidth={1.8} />Gastos Fixos</NavLink>
              <NavLink to="/variable" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><Wallet size={18} strokeWidth={1.8} />Variáveis</NavLink>
              <NavLink to="/boxes" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><PiggyBank size={18} strokeWidth={1.8} />Caixinhas</NavLink>
              <NavLink to="/shared" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><Users size={18} strokeWidth={1.8} />Compartilhados</NavLink>
              <NavLink to="/reports" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><BarChart3 size={18} strokeWidth={1.8} />Relatórios</NavLink>
              <div className="my-4 h-px bg-[var(--divider)]" />
              <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={mobileNavItemClass}><Settings size={18} strokeWidth={1.8} />Configurações</NavLink>
              <button onClick={() => { setMobileOpen(false); handleLogout() }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#C96B6B] border border-red-100 bg-red-50">
                <LogOut size={18} strokeWidth={1.8} />Sair
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Notification panel — rendered via portal to escape overflow:hidden */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        triggerRef={activeBellRef as React.MutableRefObject<HTMLElement | null>}
        notifications={notifications}
        unreadCount={unreadCount}
        hasRead={hasRead}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        deleteNotification={deleteNotification}
        deleteAllRead={deleteAllRead}
      />
    </>
  )
}