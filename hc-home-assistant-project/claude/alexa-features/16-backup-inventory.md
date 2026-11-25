# Full inventory of Owen's Echo Show 8 (crown) Fire OS backup (Nov 18, 2026)

Read-only walk of `/DATA/.media/sda3/alexa backup/echo-crown/raw-backup/full-emmc.img` (7.28 GiB, GPT, 16 partitions, Fire OS 6574.1).
- Full file lists (type, path, size): Zima `/DATA/home/Harper/echo-fireos/inventory/` → `system.tsv` (3,094 files, 668 dirs), `userdata.tsv` (15,124 files, 2,658 dirs), `cache.tsv`, `persist.tsv`.
- Walker: `inventory/fireos_walk.py <byte offset>` (fixes the old `fireos_ls.py` bug: names weren't cut at `name_len`, so priv-app, etc/init, vendor/etc/audio-algorithms and others were skipped).
- Offsets: system p12 100139008, cache p13 3353870336, persist p14 3622304768, userdata p16 3680501760.

## Other backup files
- `echo-backup/mmcblk0-full.img` (3.9 GB, earlier/partial image), `boot0.img`/`boot1.img` (preloader).
- `echo-crown/`: `amonet/` (unlock kit), `META-INF/`, `partitions.txt`, `getvar-before.txt` (bootloader vars incl. serial and unlock code; don't copy into docs).

## Raw partitions (not filesystems)
kb, dkb (key blobs), lk (bootloader), tee1/tee2, logo (boot logo), expdb (crash log area), MISC, boot (Fire OS kernel+ramdisk), p10, recovery, metadata.

## system (p12, 3 GB)
priv-app 296 files 1.6 GB (≈150 Amazon apps); lib 482 (225 MB, 664 .so total); framework 149; fonts 220 (135 MB); local 406 (102 MB models); vendor 317 (78 MB: audio HAL, audio-algorithms, halo smart-home hub, firmware, EngineerMode); app 52; usr 118; bin 317 (incl. AlexaHybridExecutionControllerLitespeed, SmartHome daemons); media 163 (99 ringtones, 22 alarms, 22 notifications, 18 UI, bootanimation.zip, boot-up wav); tts (Pico voices, 6 languages); etc 555 (skills: Lifx, Tuya, SkillWrapper).
Models (`/local/models`): keyword spotters ALEXA (en-US/GB/IN, de-DE, es-ES, ja-JP, world), AMAZON, COMPUTER, ECHO (en-US); AED (acoustic event detection), NTT, PMA (watermark spotter, ignores Alexa ads). 21 ONNX files total.

## userdata (p16, 3.9 GB, NOT encrypted)
- /app 294 files 1.29 GB: updated apps (Zoom Rooms, Silk/cloud9, Netflix, Prime Video, Chime, Spotify, Vision app, Smart-home map, Spotlight, Coldbrew, Aria, Audiohome, AFE, RNAR, WebView).
- /data 12,070 files 702 MB: per-app data. Biggest: ambienthome (281 MB, home-screen content), aria, audiohome, paladin, cloud9 (Silk), alexa.datastore (timers, lists, calendar, notifications, shopping, music, news, Voice ID enrollment, photo widget, skill caches), speech.sim (Alexa client state), alarms.db, contacts2.db, MAP identity datastores (Amazon account tokens), d3, OTA history.
- /media 970 files 233 MB (mostly 3 cached app installers + 848 config-bundle prompts).
- /alexahybrid 457 files (AmModel = local Alexa engine, smart-home registry).
- /misc: wifi (wpa_supplicant.conf = saved networks + passwords), bluedroid (paired BT devices), keystore (hardware-bound keys), smarthome_shared, blemesh.
- /system: settings_*.xml, packages.xml, accounts dbs, notification_log, recent-task screenshots.
- Logs: 230 files 40 MB (logd, tombstones, ANR, vitals). cache p13: recovery logs/kmsg. persist p14: calibration.bin, dha_certificate.pem.
