import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LOGO_URL } from '../lib/constants'

export function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError('אימייל או סיסמה שגויים')
    }
    setSubmitting(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bar-dark px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-bar-gold)_0%,_transparent_50%)] opacity-5" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-bar-border bg-bar-surface p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src={LOGO_URL} alt="בר אדר" className="mb-4 h-24 w-auto" />
            <h1 className="text-2xl font-bold text-bar-cream">בר אדר</h1>
            <p className="mt-1 text-sm text-bar-cream/60">הבר הקהילתי בהר אדר</p>
            <p className="mt-4 text-sm text-bar-gold">מערכת ניהול מלאי והזמנות</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-bar-cream/80">
                אימייל
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bar-cream/40" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-bar-border bg-bar-elevated py-2.5 pr-10 pl-4 text-bar-cream placeholder:text-bar-cream/30 focus:border-bar-gold focus:outline-none focus:ring-1 focus:ring-bar-gold"
                  placeholder="your@email.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-bar-cream/80">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bar-cream/40" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-bar-border bg-bar-elevated py-2.5 pr-10 pl-4 text-bar-cream placeholder:text-bar-cream/30 focus:border-bar-gold focus:outline-none focus:ring-1 focus:ring-bar-gold"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-bar-gold py-2.5 font-semibold text-bar-dark transition-colors hover:bg-bar-gold-light disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              התחברות
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
