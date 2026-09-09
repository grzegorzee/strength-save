# Android 51 — native smoke, isolated AOSP emulator

**PASS: install, cold start, icon/splash/login, native keyboard/Back and logged-out background/sleep resume.** No source changes, rebuild or Capacitor sync were performed by this smoke agent.

## Artifact and environment

- Installed APK: `android/app/build/outputs/apk/release/app-release.apk`, version **1.0.0 / 51**, 19,792,757 bytes.
- APK SHA256: `aa4f137654ba63617b07b8a8c001e71868e6e91fb4669f0a7e94899ad70e57fe`.
- Signature independently verified: APK v2, release **upload key** certificate SHA256 `8f65cb13ad7b7dfe0871ddaacec3b3a4524b90a48ee0953c6c37ba9be37a9c65`. This is **not** the Google Play App Signing certificate.
- Native builder identifies source commit `73f435d47c99c8df46bcf29f5d074e9a2bdef8ad`, same frozen mobile assets/resources as AAB51. Later tooling/document commits do not change this artifact identity.
- New isolated AVD `strength_android51_smoke_20260909`, serial `emulator-5562`, from already installed `system-images;android-35;default;arm64-v8a`. Android **15 / API35 AOSP ARM64**, no Play Store. Emulator37.1.11.0/build15917651, SwiftShader, no snapshot restore/save.
- 1080×2400 px/density480 = **360×800dp**, font1.0, locale en-US. WebView **124.0.6367.219**; AOSP `com.android.inputmethod.latin/.LatinIME`.
- Original `strength_launch_audit_20260906` AVD was not booted, wiped, copied or inspected for account data. Strength Save was absent on the fresh test AVD before installation. See `provenance.json` and `apk.json`.

## Observed results

| Scenario | Result and evidence |
|---|---|
| Fresh install and cold launch | PASS; install Success, live package1.0.0/51; `am start -S -W` reported COLD/Status ok, TotalTime1288ms, WaitTime1452ms |
| Launcher icon / native splash / first screen | PASS; correct dumbbell logo on lime background, no former generic icon or malformed splash. Reviewed `01-launcher.png`, `02-cold-frame-2.png`, `03-first-screen.png` |
| Email/password and native keyboard | PASS; synthetic email and masked synthetic password entered, no submit. Real AOSP keyboard visible, focused fields and sign-in control readable (`06-password-keyboard.png`) |
| Android Back | PASS; IME `mInputShown=true→false`, fields retained; repeated after resume (`10-back-closes-keyboard.png`) |
| Home/background15s → return | PASS; launcher actually became foreground, return HOT/Status ok, same PID2526 and both fields retained |
| System sleep15s → wake | PASS; KEYCODE_SLEEP yielded Dozing, wake yielded Awake; same PID2526, email and masked password retained. Focused field restored keyboard, which Back dismissed again (`09-screenoff-resume.png`) |
| In-app Back | PASS; returned from email form to signed-out method chooser (`11-form-back.png`) |
| Crash observation | PASS; crash logcat buffer empty at end; no crash dialog or process loss. Structured results in `smoke.json` and `lifecycle.json` |

No login, registration, reset-password or OAuth request was submitted. No real account, purchase or workout was created or changed. All entered form text was synthetic (`native51@example.invalid`); app remained logged out.

## Limits

This is native emulator evidence for the exact APK above, **not a physical Huawei P30 Pro/Android10/EMUI11 pass**. Actual Huawei WebView version remains unknown. No Play Store/Billing, authenticated workout, Health, timer notification/haptic or physical-device suspend test was performed. The lifecycle test covers same-process15s Home/sleep resume; it does not claim process-death recovery or prolonged background survival. Login layout smoke does not replace the separate workout layout E2E evidence.

Raw local diagnostic XML/logs, AVD config and startup video are optional local artifacts and are not required in the final evidence commit. Root owns final staging/commit; this agent made no Git mutation for this smoke.
