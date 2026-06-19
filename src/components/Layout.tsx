import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LayoutList, LogOut, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LOGO_URL } from '../lib/constants'

export function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-bar-gold/15 text-bar-gold'
        : 'text-bar-cream/70 hover:bg-bar-elevated hover:text-bar-cream'
    }`

  return (
    <div className="min-h-screen bg-bar-dark">
      <header className="sticky top-0 z-50 border-b border-bar-border bg-bar-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="בר אדר" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-bar-cream">בר אדר</h1>
              <p className="text-xs text-bar-cream/50">מערכת מלאי והזמנות</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">רשימת מלאי</span>
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/reports" className={linkClass}>
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">דוחות</span>
                </NavLink>
                <NavLink to="/users" className={linkClass}>
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">משתמשים</span>
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-medium text-bar-cream">
                {profile?.full_name ?? profile?.email}
              </p>
              <p className="text-xs text-bar-gold">
                {isAdmin ? 'מנהל' : 'משתמש'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-bar-border p-2 text-bar-cream/70 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
              title="התנתקות"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
