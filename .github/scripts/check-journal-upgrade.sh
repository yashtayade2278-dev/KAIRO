#!/usr/bin/env bash
set -euo pipefail
adb install releases/kairo-new.apk
adb install build-check/first.apk
adb install build-check/test.apk
check() {
  adb shell am instrument -w -e class "com.streakdown.app.JournalUpgradeTest#$1" \
    com.kairo.journal.test/androidx.test.runner.AndroidJUnitRunner | tee "$RUNNER_TEMP/journal-test.txt"
  grep -F 'OK (1 test)' "$RUNNER_TEMP/journal-test.txt"
}
check restoreSample
adb install -r build-check/Kairo-Journal.apk
check verifySample
adb shell pm path com.streakdown.app | grep -F 'package:'
