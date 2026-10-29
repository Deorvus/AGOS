import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
  type PermissionStatus,
} from '@capacitor/push-notifications'
import { isNativeAndroid } from './device-location'
import {
  initNotificationChannels,
  requestNotificationPermission as requestWebNotificationPermission,
  type NotificationPermissionState,
} from './nearby-alerts'

export type FcmRegistrationStatus =
  | 'idle'
  | 'prompt'
  | 'registering'
  | 'registered'
  | 'denied'
  | 'error'
  | 'unsupported'

export type PushNotificationRecord = {
  id?: string
  title?: string
  body?: string
  data?: Record<string, unknown>
  receivedAt: number
}

export type PushActionRecord = {
  actionId: string
  notification: PushNotificationRecord
  performedAt: number
}

export type FcmDiagnosticState = {
  status: FcmRegistrationStatus
  token: string | null
  error: string | null
  registeredAt: number | null
  lastReceived: PushNotificationRecord | null
  lastAction: PushActionRecord | null
  isAndroid: boolean
}

const FCM_TOKEN_STORAGE_KEY = 'agos.fcm_token.v1'
const FCM_REGISTERED_AT_KEY = 'agos.fcm_registered_at.v1'

let listenersRegistered = false
let currentStatus: FcmRegistrationStatus = 'idle'
let currentToken: string | null = null
let currentError: string | null = null
let registeredTimestamp: number | null = null
let lastReceivedNotification: PushNotificationRecord | null = null
let lastActionPerformed: PushActionRecord | null = null

const stateListeners = new Set<(state: FcmDiagnosticState) => void>()

function loadCachedToken() {
  if (typeof localStorage === 'undefined') return
  try {
    const cachedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
    const cachedAt = localStorage.getItem(FCM_REGISTERED_AT_KEY)
    if (cachedToken) {
      currentToken = cachedToken
      currentStatus = 'registered'
    }
    if (cachedAt) {
      registeredTimestamp = Number(cachedAt) || null
    }
  } catch {
    // Ignore storage issues
  }
}

loadCachedToken()

function notifyStateChange() {
  const state = getFcmDiagnosticState()
  stateListeners.forEach((listener) => {
    try {
      listener(state)
    } catch (err) {
      console.warn('FCM state listener error:', err)
    }
  })
}

export function subscribeFcmState(listener: (state: FcmDiagnosticState) => void): () => void {
  stateListeners.add(listener)
  listener(getFcmDiagnosticState())
  return () => {
    stateListeners.delete(listener)
  }
}

export function getFcmDiagnosticState(): FcmDiagnosticState {
  return {
    status: isNativeAndroid() ? currentStatus : 'unsupported',
    token: currentToken,
    error: currentError,
    registeredAt: registeredTimestamp,
    lastReceived: lastReceivedNotification,
    lastAction: lastActionPerformed,
    isAndroid: isNativeAndroid(),
  }
}

/**
 * Register push notification listeners exactly once on native Android.
 * Subscribes to token delivery, registration errors, foreground pushes, and user tap actions.
 */
function ensureListenersAttached(): void {
  if (listenersRegistered || !isNativeAndroid()) return
  listenersRegistered = true

  // 1. Successful FCM registration -> store token
  PushNotifications.addListener('registration', (token: Token) => {
    currentToken = token.value
    currentStatus = 'registered'
    currentError = null
    registeredTimestamp = Date.now()
    try {
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token.value)
      localStorage.setItem(FCM_REGISTERED_AT_KEY, String(registeredTimestamp))
    } catch {
      // Storage unavailable
    }
    notifyStateChange()
  })

  // 2. Registration failed (e.g. missing google-services.json or Google Play services error)
  PushNotifications.addListener('registrationError', (error: unknown) => {
    currentStatus = 'error'
    currentError = typeof error === 'object' && error && 'error' in error
      ? String((error as { error: unknown }).error)
      : JSON.stringify(error)
    console.warn('FCM Registration error:', currentError)
    notifyStateChange()
  })

  // 3. Push notification received while app is active
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      lastReceivedNotification = {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, unknown> | undefined,
        receivedAt: Date.now(),
      }
      notifyStateChange()
    },
  )

  // 4. User tapped / interacted with a push notification
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      lastActionPerformed = {
        actionId: action.actionId,
        notification: {
          id: action.notification.id,
          title: action.notification.title,
          body: action.notification.body,
          data: action.notification.data as Record<string, unknown> | undefined,
          receivedAt: Date.now(),
        },
        performedAt: Date.now(),
      }
      notifyStateChange()
    },
  )
}

/**
 * Checks permission and auto-registers with FCM if permission was already granted previously.
 * Safe to call on every app launch without prompting the user.
 */
export async function initPushNotifications(): Promise<void> {
  if (!isNativeAndroid()) {
    currentStatus = 'unsupported'
    return
  }

  ensureListenersAttached()
  await initNotificationChannels()

  try {
    const status: PermissionStatus = await PushNotifications.checkPermissions()
    if (status.receive === 'granted') {
      currentStatus = 'registering'
      notifyStateChange()
      await PushNotifications.register()
    } else if (status.receive === 'denied') {
      currentStatus = 'denied'
      notifyStateChange()
    } else {
      currentStatus = 'prompt'
      notifyStateChange()
    }
  } catch (err) {
    currentStatus = 'error'
    currentError = err instanceof Error ? err.message : String(err)
    console.warn('Push notification initialization error:', err)
    notifyStateChange()
  }
}

/**
 * Explicitly requests push notification permission.
 * On native Android, requests permission via PushNotifications plugin and registers with FCM upon approval.
 * On web/browser, falls back to the existing Web Notification API request.
 */
export async function requestPushPermission(): Promise<NotificationPermissionState> {
  if (!isNativeAndroid()) {
    return requestWebNotificationPermission()
  }

  ensureListenersAttached()
  await initNotificationChannels()

  try {
    let perm: PermissionStatus = await PushNotifications.checkPermissions()

    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions()
    }

    if (perm.receive === 'granted') {
      currentStatus = 'registering'
      notifyStateChange()
      await PushNotifications.register()
      return 'granted'
    }

    if (perm.receive === 'denied') {
      currentStatus = 'denied'
      notifyStateChange()
      return 'denied'
    }

    currentStatus = 'prompt'
    notifyStateChange()
    return 'prompt'
  } catch (err) {
    currentStatus = 'error'
    currentError = err instanceof Error ? err.message : String(err)
    console.warn('Push permission request error:', err)
    notifyStateChange()
    return 'denied'
  }
}
