import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Shield, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../lib/types'

export function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProfiles(data as Profile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const updateRole = async (id: string, role: UserRole) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchProfiles()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-bar-cream">ניהול משתמשים</h2>
          <p className="text-sm text-bar-cream/50">{profiles.length} משתמשים רשומים</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-bar-gold px-4 py-2 text-sm font-semibold text-bar-dark transition-colors hover:bg-bar-gold-light"
        >
          <UserPlus className="h-4 w-4" />
          הוספת משתמש
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-bar-gold" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bar-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-bar-border bg-bar-surface text-bar-cream/60">
                <th className="px-4 py-3 text-right font-medium">שם</th>
                <th className="px-4 py-3 text-right font-medium">אימייל</th>
                <th className="px-4 py-3 text-right font-medium">תפקיד</th>
                <th className="px-4 py-3 text-right font-medium">תאריך הצטרפות</th>
                <th className="px-4 py-3 text-right font-medium">שינוי תפקיד</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr
                  key={profile.id}
                  className="border-b border-bar-border/50 hover:bg-bar-surface/50"
                >
                  <td className="px-4 py-3 font-medium text-bar-cream">
                    <div className="flex items-center gap-2">
                      {profile.role === 'admin' ? (
                        <Shield className="h-4 w-4 text-bar-gold" />
                      ) : (
                        <Users className="h-4 w-4 text-bar-cream/40" />
                      )}
                      {profile.full_name ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-bar-cream/70" dir="ltr">
                    {profile.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        profile.role === 'admin'
                          ? 'bg-bar-gold/20 text-bar-gold'
                          : 'bg-bar-elevated text-bar-cream/60'
                      }`}
                    >
                      {profile.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-bar-cream/50 text-xs">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={profile.role}
                      onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                      className="rounded-lg border border-bar-border bg-bar-elevated px-2 py-1 text-sm text-bar-cream focus:border-bar-gold focus:outline-none"
                    >
                      <option value="user">משתמש</option>
                      <option value="admin">מנהל</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CreateUserModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            fetchProfiles()
          }}
        />
      )}
    </div>
  )
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: sessionData } = await supabase.auth.getSession()
    const currentSession = sessionData.session

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSaving(false)
      return
    }

    if (data.user && currentSession) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      })

      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      })
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-bar-border bg-bar-surface p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-bar-cream">הוספת משתמש חדש</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">שם מלא</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              dir="ltr"
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-bar-cream/70">תפקיד</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-bar-border bg-bar-elevated px-3 py-2 text-bar-cream focus:border-bar-gold focus:outline-none"
            >
              <option value="user">משתמש</option>
              <option value="admin">מנהל</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <p className="text-xs text-bar-cream/40">
            יש לוודא שאישור אימייל מבוטל בהגדרות Supabase Auth ליצירת משתמשים ללא אימות.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-bar-gold py-2 font-semibold text-bar-dark hover:bg-bar-gold-light disabled:opacity-60"
            >
              {saving ? 'יוצר...' : 'יצירת משתמש'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-bar-border px-4 py-2 text-bar-cream/70 hover:bg-bar-elevated"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
