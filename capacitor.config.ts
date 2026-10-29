import type { CapacitorConfig } from '@capacitor/cli'

// Separate trial identity; packaged assets never depend on the PC's localhost.
const config: CapacitorConfig = {
  appId: 'ph.agos.trial',
  appName: 'Agos Trial',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
