# Echo cancellation and the mic array on the kitchen Echo: measured (Nov 17, 2026, house empty, Owen's OK)

Owen asked whether the Echo cancels its own playback like a real Echo, whether Fire OS's audio drivers could be ported, and then (11:25 AM) to "go for the best way forward for the highest quality" (multi-mic beamforming).

## What runs on the Echo already
- LineageOS 18.1 on crown already uses Amazon's Fire OS audio HAL: `ro.hardware.audio.primary = amazon_wrapper` → `audio.primary.amazon_wrapper.so` + `audio.primary_amazon.mt8163.so`. This is a different binary from Fire OS's `vendor/lib/hw/audio.primary.mt8163.so` (sha `f40bf571…` vs `39386a9a…`).
  - Also present: `/vendor/etc/audio-algorithms/` (AFE.cfg, asp.cfg, beamformer and filter-bank coefficients, DTD/VAD priors, vad_lite.tflite, EQ/MBCL) and `libspeech_enh_lib.so`.
  - The HAL has MediaTek's AEC capture path (`AudioALSACaptureHandlerAEC`, `AudioALSACaptureDataProviderEchoRef`).
- Android reports no AcousticEchoCanceler effect (VACA capabilities: `has_aec:false`). Chrome's `echoCancellation:true` uses its own software AEC3, which only knows audio the page itself plays.

## Where Amazon's front end lived on Fire OS
- `asp.cfg`: hardware "Crown": **4 mics at 16 kHz** (calibration from `/proc/idme/miccal.`), 2 speakers at 48 kHz.
- `AFE.cfg`, in order:
  - "Num Mics" 4;
  - HPF 80 Hz on mics + reference;
  - AEC_V2 with 2 reference channels;
  - `FBF_V2` fixed beamformer with **8 beams**: `coefs_FBFV2_LowLatency_8beams.cfg` plus EVD near/far-field MVDR sets;
  - GroupBeamMerger (3-beam groups);
  - mic energy, post-AEC gain.
- `coefs_FBF.cfg` header: 64 bands × 8 beams × 4 coefs × 4 mics (complex), generated Jun 12 2019 for Crown. Filter banks: `coefs_FilterBank_160/640/AnaSyn_M512_D128_Lh512.cfg`.
- The engine is `/system/lib/libasp.so` (`amazon::asp`, AspManager, AudioFrontEnd, MicChannelExtractor).
  - On Fire OS it is linked by Amazon's **modified `libaudioflinger.so`** (Android 9 system) and by Fire OS's own HAL.
  - The LineageOS HAL and Android 11 audioflinger don't load it.
  - Porting it literally means running Fire OS's patched Android 9 audio framework inside Android 11: **not feasible** (binary system-framework port; the sources aren't available).

## Echo cancellation test (page streams, ~11:05–11:13 AM)
- Signal: self-generated `aec-test.wav`: 4 s silence, 18 s pink noise, 4 s silence, 14 s synthetic chords + beat, 4 s silence.
  - Generator: Zima `echo-fireos/aec/gen_test.py`; copy in HA `www/echo-stock-edU4oOWQEk/aec-test.wav`.
  - It takes about 25 s to start: ExoPlayer downloads the 8 MB WAV first.
- Played with `media_player.play_media` on `media_player.vaca_amzn_echo_show_8_3a31_media_player`. **Gotcha:** that player's own `volume_level` is normally 0.0 (silent); `volume_set` it first and put it back to 0.0 afterwards.
- Recorded in the dashboard page via CDP (`echo-cdp/q_aec_start.js`, raw + echoCancellation streams).
  - `q_aec_send.js` → temporary localhost receiver `echo-fireos/aec/receiver.py` (port 8782, adb reverse).
  - Analysis: `aec/analyze.py`.
- Result at media 9/15, player 1.0: both streams stayed near the kitchen's quiet level through most of the pink noise, with short leaks (+20–30 dB at the start) and dips *below* the quiet level. **The HAL already cancels the Echo's own playback** for every app's capture, so the page stream feeding stage 2 is echo-cancelled.
- So the `ww/robust.py` music stress test (music mixed in digitally, no cancellation) is too pessimistic for the Echo's own music. It still holds for outside sources (TV, a phone).

## Raw mic array: works (~11:28–11:33 AM)
- **What the HAL opens while recording:** read from `/proc/asound/card0/pcm22c/sub0/hw_params` with the mic unmuted. ALSA device **`/dev/snd/pcmC0D22c` ("TLV320AIC3101 Capture")**:
  - **6 channels, S24_3LE, 16 kHz, period 257, buffer 2570.**
  - The HAL keeps it open (EBUSY) while any app records. The mixer is identical in both states (only a timestamp control differs).
- `tinycap` can't do S24_3LE (its `-b 24` asks for S24_LE) → "Invalid argument".
- **`acap`** (my own tool):
  - Source `echo-fireos/aec/acap/acap.c`: raw ALSA ioctls, no tinyalsa.
  - Built with `python -m ziglang cc -target arm-linux-musleabihf -static -O2` (ziglang pip package in the echo-sounds venv).
  - Static 32-bit ARM, 1.2 MB.
  - Usage: `acap /dev/snd/pcmC0D22c 6 16000 s24_3 257 10 <seconds|0> > out.raw`.
  - Needs `adb root` (debuggable build) and the Echo's mic muted (`switch.vaca_amzn_echo_show_8_3a31_mute` on), so the HAL releases the device.
- **Results** (`aec/an6.py`; captures `aec/a6_silence.raw`, `aec/a6_play.raw`; per-channel WAVs next to them):
  - **ch0–3 = the 4 microphones.** Room noise about −68 dBFS each; inter-mic correlation 0.94–0.98, highest in pairs 0–1 and 2–3, so they are separate mics close together.
  - **ch4–5 = the speaker reference (L/R).** Digital zero in silence; an exact copy of the playback while it plays (corr 1.00 with each other, ~0.1 with the mics). The mics rose 10 dB when the test started.
  - Mics and reference are sample-synchronous in one stream: exactly the input Amazon's front end used.
- **Cleanup:** device test files deleted, adb back to non-root, mic unmuted, player volume back to 0.0. The kitchen listener and stage 2 reconnected (16:33 UTC).

## What it means / plan (proposed to Owen 11:35 AM)
- Highest-quality option: **our own Amazon-style front end on the Zima, fed by the raw array:**
  1. Stream the 6 channels (acap via `adb exec-out`, root, ~288 KB/s).
  2. Run AEC on each mic against the true speaker reference (e.g. WebRTC AEC3).
  3. Apply the 8-beam fixed beamformer with Amazon's Crown coefficients (or a custom MVDR).
  4. Run Amazon's "Alexa" model on every beam (best beam wins).
  5. Send the best beam to HA's voice pipeline, and to the kitchen listener.
- **Catch:** the HAL can't share the array. While our front end owns it, Android apps (VACA's mic, the page's kitchen listener) get no mic. So the front end must *replace* VACA as the voice satellite: our own Wyoming/assist-pipeline client on the Zima. VACA stays for screen, media, timers and TTS playback, and os-echo follows the new satellite's states.
- **Fallback is instant:** stop the stream and unmute VACA's mic = exactly today's setup.
- Phases:
  - (1) Offline proof on recordings: AEC + beamformer + wake on beams (needs a 6-ch recording with someone talking, and with music).
  - (2) Live stream + wake + pipeline in shadow mode next to VACA. Only possible while VACA's mic is muted, so it is done in short sessions or when nobody uses it.
  - (3) Switch over, with a one-tap fallback.
