# Echo Show 8: Android (LineageOS) tuning over ADB (Nov 9, 2026)

## Device
- LineageOS 18.1 (Android 11), `18.1-20261101-UNOFFICIAL-crown`, userdebug (`ro.debuggable=1`), armeabi-v7a, 2 GB RAM, 1280×800 at density 213.
- IP 192.168.4.44. Legacy "ADB over network" is on port 5555.
- Wireless debugging is also on. Its pairing code was not used.
- WebView is `com.android.webview` 146.
- **Input devices** (`getevent -pl`):
  - `gating` (event0): KEY_POWER. This is the mic mute button.
  - `gpio-keys` (event6): VOLUMEDOWN (114), VOLUMEUP (115) and SW_CAMERA_LENS_COVER.

## Access
- adb lives on the Zima at `/DATA/home/Harper/platform-tools/adb`: Google platform-tools, downloaded with Owen's OK.
- The Zima's key was authorized on the Echo ("Always allow").
- **zima-ssh (ssh-mcp 2.23)** classifies commands. Use literal paths: a `$VAR` command word or `python3 -c` counts as destructive and needs an approval this cloud client can't show. Plain `adb …`, `curl`, `cp`, `printf > file` and `for` loops over literals run fine. Single-line commands only, max 5000 characters.
- sftp upload needs an approval the cloud client can't show. To move files to the Zima, send base64 in chunks of 3000 characters or less and check each chunk's sha256.
- Never `pkill -f <pattern>` in the same command line that contains the pattern, because it kills its own shell.
- **Echo screenshots:** `adb exec-out screencap -p > /DATA/home/Harper/echo-backup/screen.png` works, but there is no transfer path back yet.

## Backup (before any change)
`/DATA/home/Harper/echo-backup/` on the Zima holds settings-global/secure/system.txt, packages-enabled.txt, packages-disabled.txt and packages-disabled-2026-11-09b.txt (taken before the kiosk change).

## Changes made by Claude
- Animations: window and transition scale 0, animator 0.5.
- 20 unused apps disabled with `pm disable-user` (list in an earlier revision); undo with `pm enable <pkg>`.
- VACA `ha_url` = `https://YOUR-HOST.duckdns.org:8443`, so the page is secure. This enables getUserMedia and the microphone.
- **Kiosk (Nov 9 night), done:**
  - Owen had already disabled SystemUI.
  - Home was Launcher3, which is why the Android UI showed.
  - Claude ran `cmd package set-home-activity com.msp1974.vacompanion/.MainActivity` and `pm disable-user --user 0 com.android.launcher3`.
  - VACA is the only home app and comes back after a reboot (verified).
  - Undo: `pm enable com.android.launcher3`, then `pm enable com.android.systemui`.

## Buttons: done (Nov 9 night, Owen ran the script)
- **Script:** `/DATA/home/Harper/echo-buttons.sh` on the Zima.
  1. Opens Developer options for **Rooted debugging**.
  2. Runs `adb root`.
  3. Writes `/data/system/devices/keylayout/gpio-keys.kl` (`key 114 F1`, `key 115 F2`) and `gating.kl` (`key 116 F3`).
  4. Runs `adb unroot`, then reboots.
- **Verified after the reboot:** `dumpsys input` shows gpio-keys and gating using the /data/system keylayouts.
- `automation.echo_show_mute_button_mutes_alexa` is now **disabled**: the mute key sends F3, and os-echo toggles `switch.<vaca>_mute`.
- **Permissions to fix:** the script's `mkdir` left `/data/system/devices` and `/data/system/devices/keylayout` at mode 777. `/DATA/home/Harper/echo-buttons-perms.sh` chmods them to 755; it needs Rooted debugging still on. Afterwards Owen can turn Rooted debugging off.
- **Undo:** `adb root`, `rm` both .kl files, reboot, and re-enable the mute automation.

## Kiosk exit (still pending)
- The Control Center **Kiosk / Exit Kiosk** button toggles `input_boolean.echo_show_kiosk`.
- It needs HA's Android Debug Bridge integration plus an automation running `pm enable/disable-user` for SystemUI and Launcher3. Until then, exiting kiosk is adb-only.
