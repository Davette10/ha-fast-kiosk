#!/bin/sh
# Installs the Alexa Recorder custom integration. Run in the Terminal & SSH app.
set -e
SRC=http://192.168.6.170:8765
TS=$(date +%Y%m%d-%H%M%S)
CFG=/config/configuration.yaml
if grep -qE '^assist_pipeline:' "$CFG"; then echo "STOP: assist_pipeline is already in configuration.yaml"; exit 1; fi
cp "$CFG" "$CFG.bak-recorder-$TS" && echo "Backup: $CFG.bak-recorder-$TS"
mkdir -p /config/custom_components/alexa_recorder
for f in __init__.py manifest.json services.yaml; do
  curl -fsS -o /config/custom_components/alexa_recorder/$f $SRC/alexa_recorder/$f
done
ls -la /config/custom_components/alexa_recorder
sha256sum /config/custom_components/alexa_recorder/__init__.py
if ! grep -qE '^alexa_recorder:' "$CFG"; then
  printf '\n# Alexa beta-test recorder (added %s)\nassist_pipeline:\n  debug_recording_dir: /media/alexa_log/raw\nalexa_recorder:\n' "$TS" >> "$CFG"
fi
echo "--- end of configuration.yaml ---"; tail -5 "$CFG"
echo "--- checking config ---"; ha core check && echo "CONFIG OK"
