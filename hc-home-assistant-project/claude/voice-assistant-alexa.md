# Voice assistant: Alexa-style tuning (Oct 13, 2026)

## Current setup
- Pipeline **Gemini Assist** (`01m1mv4wd92910191722ek9eyr`, preferred): STT **`stt.groqcloud_whisper`** (Groq whisper-large-v3, since Oct 13), agent `conversation.google_ai_conversation` (gemini-3.5-flash-lite), TTS `tts.piper_3` (HA's local Piper app), prefer local intents on, wake word openWakeWord "alexa".
- The Jetson (stt.faster_whisper_2 / tts.piper_2) was unavailable to HA on Oct 13.
- Satellites (both in area Harper Bedroom): Voice PE (`assist_satellite.home_assistant_voice_0a6be6_assist_satellite`, wake word Okay Nabu) and the EchoMuse Echo Dot 2nd gen (`assist_satellite.echo_voice_assistant_assist_satellite`, wake word Alexa, ESPHome device, MA player `media_player.echo_voice_assistant_2`).

## Speech-to-text (Oct 13)
- **Why it was bad:** the pipeline used the local Whisper app (`stt.faster_whisper`, misleadingly named "Parakeet (local app)") running faster-whisper **base-int8** on a 2-vCPU / 4 GB HAOS VM. Logged examples: "Set an alarm for 6:31" → "San along for 631", "Set in long for 6.33 a.n."
- **Fix (Owen chose Groq):** HACS integration "OpenAI Whisper Cloud" (fabio-garavini/ha-openai-whisper-stt-api v2.0.0, HACS id 768042531), entry `01M4TFZQ1490WMG0QRC7PA8675`, provider GroqCloud, key entered by Owen. Options: model **whisper-large-v3** (lower WER than turbo), temperature 0, prompt "Turn on the bonus room lights. Set an alarm for 6:30 a.m. Harper, Hayden, Lauren, Jason, Jill, Owen, Alexa, Harris Teeter, Fox News." (Whisper prompt ≤224 tokens; spelling hints).
- Groq free tier: ~2,000 requests/day, 28,800 audio-seconds/day, each request billed as at least 10 s. Needs internet; if Groq is down, switch the pipeline STT back to `stt.faster_whisper`.
- "No audio data received" from the integration = HA's VAD saw no speech (empty stream), not a Groq error.
- Debug: `assist_pipeline/pipeline_debug/list` and `/get` (ws commands) show each run's stt engine and transcript.
- Local alternative if wanted later: Parakeet v3 in the Whisper app (`stt_library: sherpa`) needs the HA VM raised to ~8 GB / 4 vCPUs in ZimaOS (it OOM-crashed at 4 GB in Sep). The Zima has an i5-8500 and 16 GB.

## Echo Dot microphones (EchoMuse controller)
- Controller runs on the Zima (host network): dashboard `http://192.168.6.170:8768` (login required; Claude doesn't sign in). The Echo's ESPHome API is 192.168.6.170:16001.
- EchoMuse sends HA no audio_settings, so HA applies no gain/noise suppression. Audio is 16 kHz mono S16.
- Defaults (controller `em_db.py`): micGainDb 24 (device clamp 0–42), beamformingEnabled true (centre mic hears the wake word, then the turn locks to the best of the 6 perimeter mics), beamAngle −1 (auto), aecEnabled true, nsAsr (DTLN) false, vadSilenceMs 900 (button turns only).
- EchoMuse's own fleet logs: speech RMS at the mic is 0.0001–0.0006 FS (−80 to −64 dBFS); +24 dB still leaves speech around −56 to −40 dBFS. Loudest observed chunk 0.0035 FS → +36 dB still peaks around 0.22 FS (no clipping).
- Recommended to Owen: Mic gain 24 → **36 dB** (check the device log's clipped-sample count), keep beamforming on / angle auto / AEC on, keep noise suppression **off** (EchoMuse notes it zeroes 8–15% of samples; Whisper large handles noise itself), turn Save utterances on briefly to check recordings.

## Changes made
- Piper voice: `en_US-hfc_female-medium` → `en_US-lessac-high` (Owen chose "best Piper voice only"; Kokoro on the Jetson was the recommended upgrade).
- Gemini agent: thinking level auto → **minimal** (faster). Prompt adds: warm/confident tone, no filler openers, "Sorry, I didn't catch that", FOLLOW-UPS (end with "?" only when an answer is needed — HA re-listens only when the reply ends with "?"), WHICH ROOM (no room = the speaker's room). llm_hass_api `assist` re-applied (reconfigure drops it otherwise).
- Echo Dot finished speaking detection: default → **aggressive** (0.25 s silence), same as Voice PE.
- `automation.voice_stop_talking` now stops the Voice PE, its MA player, and the Echo Dot (ESPHome + MA players).
- Verified: "18% of $64" → spoken math read-back; "set a timer" → "For how long?" with continue_conversation true; "that's enough" → silent stop.

## Research notes (Alexa → HA)
- Brief Mode ≈ HA non-verbal confirmation (2025.10): a beep instead of speech when all targets are in the satellite's area; works for local-intent hits even with an LLM pipeline (prefer local).
- Follow-Up Mode ≈ continued conversation (2025.4), only when the reply ends with "?". No always-on follow-up.
- Streaming TTS needs HA 2025.7+, a streaming Wyoming TTS (Piper 2.x default), and replies over 60 characters.
- Free TTS: Kokoro-82M (voice af_heart) is the best local option; on the Jetson via `dustynv/kokoro-tts:fastapi-r36.4.0` + `ghcr.io/roryeckel/wyoming_openai:0.7.0` on port 10210 (needs L4T r36.4). Edge TTS (Jenny/Ava) broke on Oct 10, 2026 (edge-tts issue #490). Gemini TTS free tier is 10/day.
- EchoMuse (github.com/wilbowes/EchoMuse): wake sound, ducking (−18 dB), LED scenes, EQ and AEC are set in the EchoMuse controller dashboard, not HA. v2.18 adds a Sendspin player for Music Assistant.
- Claude as the brain: HA's Anthropic integration needs a Console API key; a Claude Pro/Max subscription doesn't include API access (Console may give a one-time $5 credit in some regions).
