import { useEffect, useState } from 'react'
import type { Settings } from '../data/user'
import { formatTime, POLL_MS, type Snapshot } from '../data/monitoring'
import {
  getFcmDiagnosticState,
  subscribeFcmState,
  requestPushPermission,
  type FcmDiagnosticState,
} from '../data/push-notifications'
import { Group, Row } from './SettingsView'

export default function DeveloperView({
  settings,
  update,
  snapshot,
  onBack,
  onResearch,
}: {
  settings: Settings
  update: (p: Partial<Settings>) => void
  snapshot: Snapshot
  onBack: () => void
  onResearch: () => void
}) {
  const [fcm, setFcm] = useState<FcmDiagnosticState>(getFcmDiagnosticState)
  const [copied, setCopied] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    return subscribeFcmState((next) => setFcm(next))
  }, [])

  const copyToken = async () => {
    if (!fcm.token) return
    try {
      await navigator.clipboard.writeText(fcm.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback
    }
  }

  const handleRegisterFCM = async () => {
    setRegistering(true)
    try {
      await requestPushPermission()
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-7">
      <header className="flex items-center gap-3">
        <button
          aria-label="Back to settings"
          onClick={onBack}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-panel"
        >
          ←
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal">Development only</p>
          <h1 className="text-2xl font-extrabold">Developer tools</h1>
        </div>
      </header>
      <p className="rounded-xl border border-line bg-panel p-4 text-sm leading-relaxed text-fog">
        For prototype testing, FCM diagnostics, and research. These tools are separate from everyday
        preferences. This is a local tool area, not a secured developer account.
      </p>

      {/* Firebase Cloud Messaging (FCM) Diagnostic */}
      <Group title="Firebase Cloud Messaging (FCM) Diagnostic">
        <div className="space-y-4 p-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <span className="font-semibold text-paper">FCM Status</span>
              <p className="text-xs text-fog">
                {fcm.isAndroid
                  ? 'Native Android push registration state via Capacitor'
                  : 'Web platform · Browser Push/Local notifications active'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                fcm.status === 'registered'
                  ? 'bg-ok/10 text-ok'
                  : fcm.status === 'registering'
                    ? 'bg-teal/10 text-teal'
                    : fcm.status === 'error'
                      ? 'bg-l3/10 text-l3'
                      : fcm.status === 'denied'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-line text-fog'
              }`}
            >
              {fcm.status.toUpperCase()}
            </span>
          </div>

          {/* FCM Token Display */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-paper">Device Registration Token</span>
              {fcm.token && (
                <button
                  type="button"
                  onClick={copyToken}
                  className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-bold text-teal transition hover:bg-teal/20"
                >
                  {copied ? '✓ Copied' : 'Copy token'}
                </button>
              )}
            </div>

            {fcm.token ? (
              <div className="mt-2 rounded-xl border border-line bg-page p-3 font-mono text-xs break-all text-paper select-all">
                {fcm.token}
              </div>
            ) : (
              <p className="mt-2 rounded-xl bg-page p-3 text-xs text-fog">
                {fcm.isAndroid
                  ? 'No FCM token registered yet. Ensure google-services.json is in android/app/ and grant notification permission.'
                  : 'FCM tokens are generated on native Android devices. On web, standard Service Worker notifications operate.'}
              </p>
            )}

            {fcm.registeredAt && (
              <p className="mt-1.5 text-[11px] text-fog">
                Token generated: {formatTime(fcm.registeredAt)}
              </p>
            )}
          </div>

          {/* Trigger Registration button if on Android and not registered */}
          {fcm.isAndroid && fcm.status !== 'registered' && (
            <button
              type="button"
              onClick={handleRegisterFCM}
              disabled={registering}
              className="w-full rounded-xl bg-teal py-2.5 text-xs font-bold text-white transition hover:bg-[#005c66] disabled:opacity-50"
            >
              {registering ? 'Registering with FCM…' : 'Register with FCM now'}
            </button>
          )}

          {/* Error Message */}
          {fcm.error && (
            <div className="rounded-xl border border-l3/30 bg-l3/10 p-3 text-xs text-l3">
              <strong className="block font-bold">FCM Error:</strong>
              <span className="break-all">{fcm.error}</span>
            </div>
          )}

          {/* Integration & Sender Architecture Guidance */}
          <div className="rounded-xl border border-line bg-page/50 p-3.5 text-xs leading-relaxed text-fog">
            <strong className="block text-paper">Testing FCM Push Messages:</strong>
            <p className="mt-1">
              To test real push message delivery, copy the device token above and send a test message from the{' '}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-teal underline"
              >
                Firebase Console
              </a>{' '}
              (Messaging → Send test message) or your backend server using the Firebase Admin SDK.
            </p>
            <p className="mt-2">
              <strong>Backend Sender Notice:</strong> Automatic flood sensor push alerts require an
              external server dispatcher monitoring sensor events and triggering FCM APIs. Client apps do
              not store server keys or dispatch cloud pushes directly.
            </p>
          </div>

          {/* Last Received Push Telemetry */}
          {fcm.lastReceived && (
            <div className="rounded-xl border border-line bg-page p-3 text-xs">
              <span className="font-semibold text-paper">Last Push Notification Received:</span>
              <p className="mt-1 text-paper font-bold">{fcm.lastReceived.title ?? 'No title'}</p>
              <p className="text-fog">{fcm.lastReceived.body ?? 'No body'}</p>
              <span className="mt-1 block text-[10px] text-fog">
                Received at: {formatTime(fcm.lastReceived.receivedAt)}
              </span>
            </div>
          )}
        </div>
      </Group>

      <Group title="Research">
        <Row label="Research trials" hint="Local notebook, trial results and CSV export">
          <button
            onClick={onResearch}
            className="min-h-11 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold"
          >
            Open notebook
          </button>
        </Row>
      </Group>

      <Group title="Event testing">
        <div className="p-5">
          <label htmlFor="event-threshold" className="block font-semibold">
            Minimum water category for events
          </label>
          <p id="event-hint" className="mt-1 text-sm leading-relaxed text-fog">
            Filters water changes shown in Alerts while Agos is open. Rain events are unaffected. Background
            push is not connected.
          </p>
          <select
            id="event-threshold"
            aria-describedby="event-hint"
            value={settings.minAlert}
            onChange={(e) => update({ minAlert: Number(e.target.value) as Settings['minAlert'] })}
            className="mt-4 min-h-11 w-full rounded-lg border border-line bg-panel p-3"
          >
            <option value={0}>All categories</option>
            <option value={1}>LOW and above</option>
            <option value={2}>MID and above</option>
            <option value={3}>HIGH only</option>
          </select>
        </div>
      </Group>

      <Group title="Diagnostics">
        <dl className="grid gap-4 p-5 text-sm">
          <div>
            <dt className="font-semibold">Data source</dt>
            <dd className="mt-1 text-fog">Shared Agos bench endpoint · read-only</dd>
          </div>
          <div>
            <dt className="font-semibold">Refresh interval</dt>
            <dd className="mt-1 text-fog">{POLL_MS / 1000} seconds</dd>
          </div>
          <div>
            <dt className="font-semibold">Last app refresh</dt>
            <dd className="mt-1 text-fog">
              {snapshot.fetchedAt
                ? formatTime(new Date(snapshot.fetchedAt).toISOString())
                : 'Not available'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Snapshot</dt>
            <dd className="mt-1 text-fog">
              {snapshot.cached
                ? 'Saved on this device'
                : snapshot.data
                  ? 'Retrieved from backend'
                  : 'No data'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Capacitor native plugins</dt>
            <dd className="mt-1 text-fog">
              @capacitor/push-notifications (FCM), @capacitor/local-notifications, @capacitor/geolocation
            </dd>
          </div>
        </dl>
        {snapshot.error && (
          <p className="break-words border-t border-line p-5 text-sm text-fog">{snapshot.error}</p>
        )}
      </Group>
    </div>
  )
}

