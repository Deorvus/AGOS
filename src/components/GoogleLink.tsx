import { useEffect, useRef, useState } from 'react'
import type { User } from '../data/user'

// Optional "Sign in with Google" (Google Identity Services). Only basic profile info is read: name, email, photo.
// Set VITE_GOOGLE_CLIENT_ID to a Web OAuth client ID from Google Cloud Console to enable it.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

declare global {
  interface Window {
    google?: any
  }
}

function loadGsi(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((ok, no) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => no(new Error('Could not reach Google'))
    document.head.appendChild(s)
  })
}

// The ID token's payload carries the profile; it should be verified server-side once a database is connected
const decode = (jwt: string) => JSON.parse(decodeURIComponent(escape(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))))

export default function GoogleLink({ user, onLink, onUnlink }: { user: User; onLink: (g: NonNullable<User['google']>) => void; onUnlink: () => void }) {
  const slot = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!CLIENT_ID || user.google) return
    loadGsi()
      .then(() => {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }: { credential: string }) => {
            const p = decode(credential)
            onLink({ email: p.email, name: p.name, picture: p.picture })
          },
        })
        if (slot.current) window.google.accounts.id.renderButton(slot.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 260 })
      })
      .catch((e) => setErr(e.message))
  }, [user.google])

  if (user.google)
    return (
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg font-bold shadow ring-1 ring-line">
          <GoogleG />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{user.google.name}</span>
          <span className="block truncate text-sm text-fog">{user.google.email}</span>
        </span>
        <button onClick={onUnlink} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-fog">
          Unlink
        </button>
      </div>
    )

  return (
    <div>
      {CLIENT_ID ? (
        <div ref={slot} className="min-h-11" />
      ) : (
        <button disabled className="flex items-center gap-3 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-semibold opacity-60" title="Google sign-in isn't set up yet">
          <GoogleG /> Continue with Google
          <span className="text-xs font-normal text-fog">· coming soon</span>
        </button>
      )}
      {err && <p className="mt-2 text-sm text-l3">{err}</p>}
    </div>
  )
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
  </svg>
)
