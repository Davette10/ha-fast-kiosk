#!/DATA/home/Harper/kitchen-listen/venv/bin/python3
"""Kitchen listener (Nov 16 2026, Owen asked for it; everyone in the house knows and agreed).

The Echo Show's dashboard page records the kitchen mic, cuts it into one clip per
stretch of talking, and POSTs each clip here through `adb reverse` (so clips only ever
arrive from 127.0.0.1). Each clip is transcribed locally with faster-whisper; nothing
leaves the house at this step.

Files (a "day" runs 4 AM to 4 AM so the 4 AM review gets one whole day):
  audio/<day>/<HH-MM-SS>_<n>.wav   kept AUDIO_DAYS days (so complaints can be listened to)
  text/<day>/<HH-MM-SS>_<n>.txt    one text file per clip, kept TEXT_DAYS days
  text/<day>/day.jsonl             one line per clip (time, length, Alexa state, text)

Home Assistant (192.168.6.172 + the review key) reads:
  GET /day?d=YYYY-MM-DD&k=KEY   whole day as plain lines for the Gemini review
  GET /stats?k=KEY              health numbers for a sensor
Started and kept running by alexa-review/trigger.py (listen_loop).
"""
import io, json, os, re, subprocess, threading, time
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = "/DATA/home/Harper/kitchen-listen"
KEY = open("/DATA/home/Harper/alexa-review/state/trigger.key").read().strip()
HA = {"192.168.6.172"}
ADB = "/DATA/home/Harper/platform-tools/adb"
ECHO = "192.168.4.44:5555"
PORT = 8780
MODEL = os.environ.get("KL_MODEL", "small.en")
AUDIO_DAYS, TEXT_DAYS = 2, 30
MAX_CLIP = 2 * 1024 * 1024  # 60 s of 16 kHz 16-bit mono is ~1.9 MB
# Whisper's usual inventions on noise; dropped when the clip is short
JUNK = re.compile(r"^\W*(thank you|thanks for watching|you|bye|\.|okay)\W*$", re.I)

STATS = {"started": time.strftime("%Y-%m-%dT%H:%M:%S"), "clips": 0, "dropped": 0, "seconds": 0.0,
         "busy_s": 0.0, "last_clip": "", "last_text": "", "errors": 0, "last_error": ""}
_model, _mlock, _n = None, threading.Lock(), [0]


def day_of(ts):
    return (ts - timedelta(hours=4)).strftime("%Y-%m-%d")


def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=3,
                              download_root=os.path.join(BASE, "models"))
    return _model


def transcribe(wav):
    t0 = time.time()
    with _mlock:
        import numpy as np  # the clips are plain 16 kHz 16-bit mono WAV; skip PyAV (its open() changed)
        pcm = np.frombuffer(wav[44:len(wav) - (len(wav) - 44) % 2], dtype="<i2").astype(np.float32) / 32768.0
        segs, info = model().transcribe(pcm, language="en", beam_size=1, vad_filter=True,
                                        condition_on_previous_text=False, no_speech_threshold=0.6)
        parts = [s.text.strip() for s in segs if s.no_speech_prob < 0.8 and s.avg_logprob > -1.2]
    STATS["busy_s"] = round(STATS["busy_s"] + time.time() - t0, 1)
    return " ".join(p for p in parts if p).strip()


def save_clip(wav, q):
    now = datetime.now()
    try:
        start = datetime.fromtimestamp(int((q.get("ts") or ["0"])[0]) / 1000) or now
    except Exception:
        start = now
    if abs((start - now).total_seconds()) > 600:
        start = now
    dur = max(0.0, (len(wav) - 44) / 32000.0)
    text = transcribe(wav)
    if not text or (dur < 4 and JUNK.match(text)):
        STATS["dropped"] += 1
        return {"ok": True, "text": "", "kept": False}
    d = day_of(start)
    _n[0] += 1
    name = "%s_%d" % (start.strftime("%H-%M-%S"), _n[0])
    sat = (q.get("sat") or [""])[0][:40]
    for sub in ("audio", "text"):
        os.makedirs(os.path.join(BASE, sub, d), exist_ok=True)
    with open(os.path.join(BASE, "audio", d, name + ".wav"), "wb") as f:
        f.write(wav)
    with open(os.path.join(BASE, "text", d, name + ".txt"), "w") as f:
        f.write("%s  (%.1f s, Alexa: %s)\n%s\n" % (start.strftime("%Y-%m-%d %I:%M:%S %p"), dur, sat or "idle", text))
    line = {"t": start.strftime("%Y-%m-%dT%H:%M:%S"), "dur": round(dur, 1), "sat": sat, "text": text, "file": name}
    with open(os.path.join(BASE, "text", d, "day.jsonl"), "a") as f:
        f.write(json.dumps(line) + "\n")
    STATS["clips"] += 1
    STATS["seconds"] = round(STATS["seconds"] + dur, 1)
    STATS["last_clip"], STATS["last_text"] = line["t"], text[:120]
    return {"ok": True, "text": text, "kept": True, "file": name}


def day_text(d):
    p = os.path.join(BASE, "text", d, "day.jsonl")
    out, n, secs = [], 0, 0.0
    try:
        for raw in open(p):
            try:
                x = json.loads(raw)
            except Exception:
                continue
            n += 1
            secs += x.get("dur", 0)
            tag = " [while Alexa was %s]" % x["sat"] if x.get("sat") and x["sat"] != "idle" else ""
            out.append("%s%s: %s" % (x["t"][11:19], tag, x["text"]))
    except FileNotFoundError:
        pass
    txt = "\n".join(out)
    if len(txt) > 600000:  # keep the end of the day if it is enormous
        txt = txt[-600000:]
    return {"date": d, "clips": n, "minutes": round(secs / 60, 1), "text": txt}


def keep_reverse():
    """The Echo reaches us at its own 127.0.0.1:8780 through adb reverse; re-apply it after any reconnect."""
    while True:
        try:
            r = subprocess.run([ADB, "-s", ECHO, "reverse", "tcp:%d" % PORT, "tcp:%d" % PORT],
                               capture_output=True, timeout=15)
            if r.returncode != 0:
                subprocess.run([ADB, "connect", ECHO], capture_output=True, timeout=15)
        except Exception:
            pass
        time.sleep(60)


def cleanup():
    while True:
        now = datetime.now()
        for sub, days in (("audio", AUDIO_DAYS), ("text", TEXT_DAYS)):
            root = os.path.join(BASE, sub)
            cut = (now - timedelta(hours=4) - timedelta(days=days)).strftime("%Y-%m-%d")
            try:
                for d in os.listdir(root):
                    if re.match(r"^\d{4}-\d{2}-\d{2}$", d) and d < cut:
                        subprocess.run(["rm", "-rf", os.path.join(root, d)])
            except FileNotFoundError:
                pass
        time.sleep(3600)


class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):  # the Echo page's CORS / local-network preflight
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/chunk" or self.client_address[0] != "127.0.0.1":
            return self._send(403, {"error": "forbidden"})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 44 or n > MAX_CLIP:
            return self._send(400, {"error": "bad size"})
        wav = self.rfile.read(n)
        try:
            return self._send(200, save_clip(wav, parse_qs(u.query)))
        except Exception as e:
            STATS["errors"] += 1
            STATS["last_error"] = "%s %s" % (time.strftime("%H:%M:%S"), str(e)[:200])
            return self._send(500, {"error": str(e)[:200]})

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path == "/ping" and self.client_address[0] == "127.0.0.1":
            return self._send(200, {"ok": True})
        if self.client_address[0] not in HA | {"127.0.0.1"} or (q.get("k") or [""])[0] != KEY:
            return self._send(403, {"error": "forbidden"})
        if u.path == "/day":
            d = (q.get("d") or [day_of(datetime.now() - timedelta(days=1))])[0]
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
                return self._send(400, {"error": "bad date"})
            return self._send(200, day_text(d))
        if u.path == "/stats":
            today = day_text(day_of(datetime.now()))
            return self._send(200, dict(STATS, model=MODEL, today_clips=today["clips"], today_minutes=today["minutes"]))
        return self._send(404, {"error": "unknown"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    threading.Thread(target=keep_reverse, daemon=True).start()
    threading.Thread(target=cleanup, daemon=True).start()
    threading.Thread(target=model, daemon=True).start()  # load (and on first run download) the model early
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
