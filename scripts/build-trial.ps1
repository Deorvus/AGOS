$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectDir
try {
    if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) { throw 'Java 21 is required. Install Android Studio or set JAVA_HOME to a Java 21 directory.' }
    if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT -and -not (Test-Path -LiteralPath 'android/local.properties')) { throw 'An Android SDK and your acceptance of its license are required. Configure it through Android Studio.' }
    & pnpm android:sync
    if ($LASTEXITCODE -ne 0) { throw 'Android asset sync failed.' }
    & pnpm android:verify
    if ($LASTEXITCODE -ne 0) { throw 'Android package verification failed.' }
    Push-Location -LiteralPath 'android'
    try { & .\gradlew.bat --no-daemon assembleDebug; if ($LASTEXITCODE -ne 0) { throw 'Android compilation failed.' } }
    finally { Pop-Location }
    Write-Host 'Trial APK: android/app/build/outputs/apk/debug/app-debug.apk'
} finally { Pop-Location }
