#!/bin/bash
# Copies the original Echo Show sound effects out of YOUR OWN Fire OS backup (read-only; the backup is not changed)
# and packs them for the Zima so Claude can set them up on the Echo.
# Run on the Ubuntu PC:  bash get-echo-sounds.sh
set -u
IMG="$HOME/echo-crown/raw-backup/full-emmc.img"
OUT="$HOME/echo-crown/fireos-sounds"
[ -f "$IMG" ] || { echo "Backup not found at $IMG"; exit 1; }
rm -rf "$OUT"; mkdir -p "$OUT/files" "$OUT/apps"
LOOP=$(sudo losetup -P -f -r --show "$IMG") || exit 1
cleanup() { for m in /mnt/echo-fos-*; do mountpoint -q "$m" && sudo umount "$m"; done; sudo losetup -d "$LOOP"; }
trap cleanup EXIT
sleep 1
lsblk -lnpo NAME,PARTLABEL,SIZE "$LOOP" > "$OUT/partitions.txt"
cat "$OUT/partitions.txt"
n=0
for dev in $(lsblk -lnpo NAME "$LOOP" | tail -n +2); do
  label=$(lsblk -lnpo PARTLABEL "$dev"); label=${label:-part$n}; n=$((n+1))
  case "$label" in system*|vendor*|product*|oem*|odm*|part*) ;; *) continue ;; esac
  mp="/mnt/echo-fos-$label"; sudo mkdir -p "$mp"
  sudo mount -o ro,noload "$dev" "$mp" 2>/dev/null || sudo mount -o ro "$dev" "$mp" 2>/dev/null || { sudo rmdir "$mp"; continue; }
  echo "Searching $label ($dev)..."
  # loose sound files
  sudo find "$mp" -type f \( -iname '*.ogg' -o -iname '*.mp3' -o -iname '*.wav' -o -iname '*.m4a' -o -iname '*.opus' -o -iname '*.aac' -o -iname '*.flac' \) -print0 |
    while IFS= read -r -d '' f; do d="$OUT/files/$label${f#$mp}"; mkdir -p "$(dirname "$d")"; sudo cat "$f" > "$d"; done
  # sounds packed inside apps (Alexa's sounds live in its apps)
  sudo find "$mp" -type f -name '*.apk' -print0 |
    while IFS= read -r -d '' a; do
      if sudo unzip -l "$a" 2>/dev/null | grep -qiE '\.(ogg|mp3|wav|m4a|opus|aac|flac)$'; then
        name=$(basename "$a" .apk); mkdir -p "$OUT/apps/$name"
        sudo unzip -qo "$a" '*.ogg' '*.mp3' '*.wav' '*.m4a' '*.opus' '*.aac' '*.flac' -d "$OUT/apps/$name" 2>/dev/null
      fi
    done
  sudo umount "$mp"; sudo rmdir "$mp"
done
sudo chown -R "$USER:" "$OUT"
echo "Found $(find "$OUT" -type f -not -name partitions.txt | wc -l) sound files ($(du -sh "$OUT" | cut -f1))."
tar czf "$HOME/echo-crown/fireos-sounds.tgz" -C "$HOME/echo-crown" fireos-sounds
scp "$HOME/echo-crown/fireos-sounds.tgz" Harper@192.168.6.170:/DATA/home/Harper/ && echo "Sent to the Zima. Tell Claude it's done."
