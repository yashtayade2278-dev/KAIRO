# Kairo Android source bundle

This bundle contains the current source tree and native Android widget implementation, with older ZIP snapshots, APK binaries, dependencies, caches, and generated build directories removed.

## Build a debug APK in GitHub Codespaces

Run from the repository root (the directory containing `package.json`):

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Expected APK:
`android/app/build/outputs/apk/debug/app-debug.apk`

To copy it to the repository root as `kairo-new.apk`:

```bash
cp app/build/outputs/apk/debug/app-debug.apk ../kairo-new.apk
```

Run that copy command from the `android` directory after a successful build.

## Notes
- Android application ID: `com.streakdown.app`
- Capacitor app name: `Kairo`
- `android/app/src/main/assets/public/` is retained as the current bundled web assets, but `npm run build` followed by `npx cap sync android` refreshes it from `src/`.
- This bundle has not been built or device-tested in this environment. A successful build and testing on the target phone are still required.
