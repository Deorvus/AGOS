# Agos Android trial

## Build status

Android project prepared with Capacitor 8.5.2. App identity: `ph.agos.trial`; launcher name: **Agos Trial**; wrapper version: **0.1.1-trial**; minimum Android API 24 (Android 7), compile/target API 36. The app UI retains its existing version information.

The current web build is bundled in the Android project. No development-server URL is configured: the phone does not connect to the PC's localhost. Internet is still required for remote maps, location suggestions, routes and new FloodWatch readings. The saved evacuation dataset is included and retains its date and attribution.

The debug APK was compiled on October 3, 2026 after the user personally installed the required Android SDK packages and handled license acceptance. The delivered file is **Agos-Trial-0.1.1.apk** (4,700,965 bytes). Android's signing verifier confirms its APK Signature Scheme v2 signature. All 14 bundled web files exactly match the current production build. Android device behavior has not been verified.

## Included preparation

- Native launcher uses the existing Agos icon.
- Internet and optional foreground coarse/fine location permissions only. Location is requested when a user chooses a location action, not at startup. No background location or notification permissions are declared.
- Uses Capacitor's WebView geolocation permission bridge with the existing cancellable acquisition logic. This is not evidence that the previous device timeout is resolved.
- Android permission guidance points to Agos Trial instead of Chrome. Precise and approximate location outcomes need phone testing.
- Service-worker registration is skipped inside the native wrapper so APK assets are not replaced by a stale web-shell cache. Ordinary web installation remains supported.
- Layout accepts Capacitor's system-inset CSS variables, with ordinary browser fallbacks. Keyboard resize is configured. Phone notch, gesture bars and keyboard behavior still require actual-device verification.
- Automatic Android app backup and cleartext traffic are disabled for the trial. Trial profile and saved places are separate from the website's browser storage.
- No Google/Firebase account, paid service, push notifications or deployment was created.

## Build after SDK setup

Install Node 22 or later, pnpm, and Android Studio with a Java 21 runtime. Through SDK Manager, review and accept Google's SDK license yourself and install Android SDK Platform 36 and the build tools required by the project.

From the project directory:

```powershell
pnpm install
pnpm android:sync
pnpm android:verify
pnpm android:apk
```

Alternatively open `android/` in Android Studio and build the debug APK. The artifact is normally `android/app/build/outputs/apk/debug/app-debug.apk`. A debug APK is suitable for a controlled trial; it is not a signed public-release package.

No script silently accepts SDK agreements, enables installation permissions on a phone, or deploys the app.

## Trial on an Android phone once an APK is built

1. Transfer the actual `.apk` file to the phone and open it. If Android asks, allow installation for that file source only if you choose to proceed.
2. Open **Agos Trial**. Existing browser profile/saved places do not automatically transfer.
3. Start with manual trip entry. Confirm historical-reading age, correct place suggestions, evacuation warnings and destination handoff.
4. Test optional location only with the phone owner's consent. Check permission denial, approximate/precise permission, device location disabled, timeout, cancellation and manual recovery. Do not assume success from compilation.
5. Check Back, keyboard, scrolling, gesture/status bars, landscape, slow connection and interrupted/resumed sessions.
6. Keep tests supervised. Agos cannot verify current road safety or whether a mapped center is open.

Keep the same signing key for future APK updates if trial data must survive an update. Uninstalling clears the app's local data. Do not distribute a developer signing key with the project archive.

## Validation completed before SDK compilation

- Type check and production web build passed.
- Existing 26 automated checks passed.
- Android package verification compared all 14 built files with copied Android assets and checked identity, no development-server URL and limited permissions.
- Browser regression checks are recorded in the accompanying trial notes; they do not count as Android runtime verification.

## APK validation

- Gradle `assembleDebug`: PASS. The first sandboxed attempt failed with compiler access-denied errors; the retry outside the Windows sandbox succeeded without source changes.
- APK archive CRC and all 14 production web files: PASS.
- Packaged identity, launcher, version, minimum API 24 and target API 36: PASS through Android's package inspection tool.
- APK signature: PASS (v2, Android Debug certificate). This is a debug trial package, not a production-release signing setup.
- Packaged permissions: Internet, foreground coarse/fine location, and AndroidX's signature-level internal dynamic-receiver permission. No background location, camera, microphone, contacts or notification permission.
- SHA256: `31818f9fa29f91c3aefbca94a9a74611b0e7251bb9481c3529a38799d7742277`.
- Installation and actual native behavior: NOT VERIFIED. No phone or emulator was tested.
- Nonblocking build warnings remain for the generated flatDir repositories, SDK XML metadata version and unchecked Java operations. None caused the successful build to fail.

## Official references

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [System bars and safe-area fallbacks](https://capacitorjs.com/docs/apis/system-bars)
- [Google Android SDK terms](https://developer.android.com/studio#terms-and-conditions)
- [Android Studio build/run](https://developer.android.com/studio/run)


## Logo update — trial 0.1.1

- Replaced the Android launcher with three cyan waves on navy, matching the Agos header motif and colors. The website's header is unchanged.
- Added Android adaptive foreground/background layers, round and legacy density icons, and a monochrome layer for themed launchers. The opening-screen theme uses the same wave mark.
- Version code increased from 1 to 2; package identity and signing certificate are unchanged. Install the new APK as an update rather than uninstalling if you want to preserve trial data.
- PASS: Gradle assembleDebug, signature verification with the same certificate, zip alignment, APK archive integrity, all 14 bundled web files, and compiled adaptive-icon resource inspection. Android's package tool now lists launcher icons at all inspected densities.
- NOT VERIFIED: appearance in an actual phone launcher, themed icons and the opening screen. The logo preview is a rendered asset, not an Android screenshot.
- Design references: [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [Android splash screen](https://developer.android.com/develop/ui/views/launch/splash-screen).
