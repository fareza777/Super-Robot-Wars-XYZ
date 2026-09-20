---
name: testing-srw-android
description: How to test the SRW XYZ Android APK on the headless emulator on this machine — launch, adb-driven input/screenshots, video capture via screenrecord, and coordinate mapping.
---

# Testing SRW XYZ (or any Android APK) on the headless emulator

## Machine constraints
- This box has **no X display / desktop** — the `computer` tool and `recording_start` FAIL (`enigo init failed` / FFmpeg exit 1). The emulator GUI cannot start (`Fatal: no Qt platform plugin` on display :0).
- Run the emulator **headless** and drive it entirely over `adb`.

## Launch
```bash
nohup /home/ubuntu/android-sdk/emulator/emulator -avd srw -no-snapshot -gpu swiftshader_indirect -no-audio -no-window > /tmp/emu.log 2>&1 &
# wait for boot:
adb -s emulator-5554 shell getprop sys.boot_completed   # until it prints 1 (~1-2 min)
adb -s emulator-5554 install -r /home/ubuntu/srw-xyz-v0.5.apk
adb -s emulator-5554 shell monkey -p com.fareza777.srwxyz -c android.intent.category.LAUNCHER 1
```
AVD `srw`: android-35, framebuffer 2400x1080 in landscape (app forces landscape).

## Interacting without a GUI
- Screenshot: `adb -s emulator-5554 exec-out screencap -p > shot.png` then view the PNG (read tool renders it ~1568px wide).
- **Coordinate mapping**: image px → device px ≈ **×1.531 (x) / ×1.53 (y)**, not the ×1.5 sometimes quoted. When a tap silently does nothing, it probably landed in a gap between buttons — crop the PNG at native res (`python3 -c "from PIL import Image; Image.open('f.png').crop((x1,y1,x2,y2)).save('/tmp/c.png')"`) to find exact bounds.
- Tap: `adb -s emulator-5554 shell input tap <devX> <devY>`; scroll: `input swipe x1 y1 x2 y2 <ms>`.
- `uiautomator dump` does NOT work — infinite RN animations keep the UI non-idle ("could not get idle state").
- `input tap` may drop on swiftshader under load — retry once before calling it a bug.

## Video evidence (replaces recording tools)
```bash
adb -s emulator-5554 shell screenrecord --time-limit 240 /sdcard/seg.mp4   # run detached; max 240s
# stop early: adb -s emulator-5554 shell kill -2 $(adb -s emulator-5554 shell pidof screenrecord)
adb -s emulator-5554 pull /sdcard/seg.mp4 .
# frame analysis: ffmpeg -ss <t> -i seg.mp4 -frames:v 1 -vf crop=... out.png
```
Start a new segment before each major phase; pull before the 240s limit or kill -2 for a clean finalize.
- **Caveat**: `screenrecord` heavily starves the JS thread under swiftshader. During multi-battle enemy phases the app can appear frozen 60-90s on one frame — kill screenrecord (`kill -2 $(pidof screenrecord)`) and the app usually resumes on its own. Prefer screencap polling for long phases; record only short single battles.
- If the RN red box appears (`TypeError ...` full-screen), DISMISS sits ~device (1014,927); the app may soft-lock black afterwards — recover via `am force-stop com.fareza777.srwxyz` + relaunch (save persists).

## App-specific notes (com.fareza777.srwxyz)
- First-boot image decode is slow — wait ~20-30s before asserting missing art.
- Useful device-px coords (2400x1080): title TOUCH TO START ~(1200,1000); intro/dialog SKIP top-right ~(2220,95); home menu items ~(605,490); HQ DEPLOY tile ~(2036,597); briefing DEPLOY ▸ ~(1033,1002); END TURN ~(2014,997); side panel scroll region x≈2280.
- Battle timing: battle scene ≈ intro 1s → banner ~1s → attack ~2.3s (pilot voice bar top-left) → impact ~2s (damage count-up) → optional counter → outro; capture mid-attack ~3-4s after target tap.
- Shop/upgrade buttons sit lower than row labels — crop to find centers before tapping.

## Devin Secrets Needed
- None for emulator testing. (App bundles its own assets; no network needed.)
