"""Alexa Recorder: saves every voice-assistant conversation for later review.

For every Assist pipeline run it writes, under <root>/<date>/<time>_<device>/:
  turnNN_user.wav    what the microphone sent (from the wake word to the end of speech)
  turnNN_alexa.wav   what the assistant said back
  turnNN.json        parsed summary of the turn (heard, tools used, reply, timings, errors)
  turnNN_events.json raw pipeline events
  turnNN_screen.png  screenshot of the screen (written by script.alexa_log_turn)
  turnNN_notes.json  AI review notes (written via alexa_recorder.add_notes)
  conversation.wav   all turns joined in order (user, alexa, user, alexa ...)
  transcript.md      readable transcript with everything above
and appends one line per turn to <root>/index.jsonl.

User audio comes from Home Assistant's own assist_pipeline debug_recording_dir.
Nothing is ever deleted except empty leftover recording folders.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, is_dataclass
from datetime import datetime, timedelta
import json
import logging
import os
from pathlib import Path
import re
import shutil
import time
from typing import Any

import voluptuous as vol

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

DOMAIN = "alexa_recorder"
EVENT_SAVED = "alexa_recorder_turn_saved"

CONF_ROOT = "root"
CONF_RAW = "raw_dir"
CONF_GAP = "conversation_gap_minutes"

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Optional(CONF_ROOT, default="/media/alexa_log/conversations"): cv.string,
                vol.Optional(CONF_RAW, default="/media/alexa_log/raw"): cv.string,
                vol.Optional(CONF_GAP, default=10): vol.Coerce(int),
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)

NOTES_SCHEMA = vol.Schema(
    {
        vol.Required("folder"): cv.string,
        vol.Required("turn"): vol.Coerce(int),
        vol.Optional("notes"): vol.Any(dict, list, str, None),
        vol.Optional("score"): vol.Any(int, float, str, None),
    },
    extra=vol.ALLOW_EXTRA,
)


def _jsonable(obj: Any) -> Any:
    """Make pipeline objects JSON friendly."""
    if is_dataclass(obj) and not isinstance(obj, type):
        try:
            return asdict(obj)
        except Exception:  # noqa: BLE001
            return str(obj)
    if isinstance(obj, (set, tuple)):
        return list(obj)
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, default=_jsonable, indent=2, ensure_ascii=False)


def _slug(text: str) -> str:
    text = re.sub(r"[^A-Za-z0-9]+", "-", text or "").strip("-").lower()
    return text[:40] or "device"


def _etype(ev: Any) -> str:
    t = getattr(ev, "type", None)
    return str(getattr(t, "value", t))


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Create the recorder; it starts from YAML or from a config entry."""
    conf = config.get(DOMAIN) or {}
    rec = AlexaRecorder(
        hass,
        Path(conf.get(CONF_ROOT, "/media/alexa_log/conversations")),
        Path(conf.get(CONF_RAW, "/media/alexa_log/raw")),
        int(conf.get(CONF_GAP, 10)),
    )
    hass.data[DOMAIN] = rec
    hass.services.async_register(DOMAIN, "add_notes", rec.async_add_notes, schema=NOTES_SCHEMA)
    if DOMAIN in config:
        _start_when_ready(hass, rec)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: Any) -> bool:
    """Start the recorder from the UI-added entry."""
    _start_when_ready(hass, hass.data[DOMAIN])
    return True


async def async_unload_entry(hass: HomeAssistant, entry: Any) -> bool:
    """Stop polling (files already saved stay)."""
    hass.data[DOMAIN].stop()
    return True


def _start_when_ready(hass: HomeAssistant, rec: "AlexaRecorder") -> None:
    @callback
    def _start(_event: Any = None) -> None:
        rec.start()

    if hass.state is CoreState.running:
        _start()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _start)


class AlexaRecorder:
    """Watches pipeline debug data and saves finished runs."""

    def __init__(self, hass: HomeAssistant, root: Path, raw: Path, gap_min: int) -> None:
        self.hass = hass
        self.root = root
        self.raw = raw
        self.gap = timedelta(minutes=gap_min)
        self.seen: dict[str, float] = {}
        self.used_raw: set[str] = set()
        self.convs: dict[str, dict[str, Any]] = {}
        self.lock = asyncio.Lock()
        self._unsub: Any = None

    # ------------------------------------------------------------------ polling
    def start(self) -> None:
        if self._unsub:
            return
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            self.raw.mkdir(parents=True, exist_ok=True)
        except OSError as err:
            _LOGGER.error("Alexa Recorder cannot create folders: %s", err)
        self._ensure_debug_dir()
        self._unsub = async_track_time_interval(self.hass, self._poll, timedelta(seconds=2))
        _LOGGER.info("Alexa Recorder started, saving to %s", self.root)

    def stop(self) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None

    @callback
    def _ensure_debug_dir(self) -> None:
        """Turn on Assist's own audio recording (same as the YAML debug_recording_dir)."""
        key = "assist_pipeline.config"
        cur = self.hass.data.get(key)
        if isinstance(cur, dict) or cur is None:
            cur = dict(cur or {})
            if not cur.get("debug_recording_dir"):
                cur["debug_recording_dir"] = str(self.raw)
                self.hass.data[key] = cur

    @callback
    def _poll(self, _now: datetime) -> None:
        try:
            self._ensure_debug_dir()
            pdata = self.hass.data.get("assist_pipeline")
            debug = getattr(pdata, "pipeline_debug", None)
            if not debug:
                return
            now = time.time()
            for pipeline_id, runs in list(debug.items()):
                for run_id, dbg in list(runs.items()):
                    if run_id in self.seen:
                        continue
                    events = list(getattr(dbg, "events", []) or [])
                    types = [_etype(e) for e in events]
                    try:
                        started = dt_util.parse_datetime(dbg.timestamp).timestamp()
                    except Exception:  # noqa: BLE001
                        started = now
                    if "run-end" in types or now - started > 180:
                        self.seen[run_id] = now
                        self.hass.async_create_background_task(
                            self._save(pipeline_id, run_id, events, started),
                            f"alexa_recorder_{run_id}",
                        )
            if len(self.seen) > 500:
                for k in sorted(self.seen, key=self.seen.get)[:250]:
                    self.seen.pop(k, None)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Alexa Recorder poll failed")

    # ------------------------------------------------------------------ parsing
    def _parse(self, events: list) -> dict[str, Any]:
        t: dict[str, Any] = {
            "heard": None, "intent_input": None, "reply": None, "response_type": None,
            "error": None, "tools": [], "stt_engine": None, "agent": None, "tts": None,
            "tts_url": None, "tts_mime": None, "conversation_id": None, "device_id": None,
            "satellite_id": None, "vad": {}, "timeline": [], "source": "typed",
            "processed_locally": None, "continue_conversation": None,
        }
        t0 = None
        content: list[str] = []
        calls: dict[str, dict] = {}
        for ev in events:
            typ = _etype(ev)
            data = getattr(ev, "data", None) or {}
            ts = getattr(ev, "timestamp", None)
            try:
                tsv = dt_util.parse_datetime(ts).timestamp() if ts else None
            except Exception:  # noqa: BLE001
                tsv = None
            if t0 is None and tsv:
                t0 = tsv
            if typ != "intent-progress":
                t["timeline"].append({"event": typ, "at_s": round(tsv - t0, 2) if (tsv and t0) else None})
            if typ == "run-start":
                t["conversation_id"] = data.get("conversation_id")
                t["satellite_id"] = data.get("satellite_id")
                out = data.get("tts_output") or {}
                t["tts_url"] = out.get("url")
                t["tts_mime"] = out.get("mime_type")
            elif typ == "stt-start":
                t["stt_engine"] = data.get("engine")
                t["source"] = "voice"
            elif typ in ("stt-vad-start", "stt-vad-end"):
                t["vad"][typ] = data.get("timestamp")
            elif typ == "stt-end":
                t["heard"] = ((data.get("stt_output") or {}).get("text") or "").strip()
            elif typ == "intent-start":
                t["agent"] = data.get("engine")
                t["intent_input"] = data.get("intent_input")
                t["device_id"] = data.get("device_id") or t["device_id"]
                t["conversation_id"] = data.get("conversation_id") or t["conversation_id"]
            elif typ == "intent-progress":
                d = data.get("chat_log_delta") or {}
                d = _jsonable(d) if not isinstance(d, dict) else d
                if isinstance(d, dict):
                    if d.get("content"):
                        content.append(str(d["content"]))
                    for tc in d.get("tool_calls") or []:
                        tc = tc if isinstance(tc, dict) else (_jsonable(tc) if is_dataclass(tc) else {"raw": str(tc)})
                        cid = str(tc.get("id") or len(calls))
                        calls[cid] = {"tool": tc.get("tool_name"), "args": tc.get("tool_args"), "result": None}
                    if d.get("role") == "tool_result":
                        cid = str(d.get("tool_call_id"))
                        entry = calls.setdefault(cid, {"tool": d.get("tool_name"), "args": None, "result": None})
                        entry["result"] = d.get("tool_result")
            elif typ == "intent-end":
                io = data.get("intent_output") or {}
                resp = io.get("response") or {}
                t["reply"] = ((resp.get("speech") or {}).get("plain") or {}).get("speech")
                t["response_type"] = resp.get("response_type")
                if resp.get("response_type") == "error":
                    t["error"] = (resp.get("data") or {}).get("code") or "error"
                t["conversation_id"] = io.get("conversation_id") or t["conversation_id"]
                t["continue_conversation"] = io.get("continue_conversation")
                t["processed_locally"] = data.get("processed_locally")
            elif typ == "tts-start":
                t["tts"] = {"engine": data.get("engine"), "voice": data.get("voice"), "text": data.get("tts_input")}
            elif typ == "tts-end":
                out = data.get("tts_output") or {}
                t["tts_url"] = out.get("url") or t["tts_url"]
                t["tts_mime"] = out.get("mime_type") or t["tts_mime"]
            elif typ == "error":
                t["error"] = f"{data.get('code')}: {data.get('message')}"
        if not t["reply"] and content:
            t["reply"] = "".join(content)
        t["tools"] = list(calls.values())
        t["duration_s"] = t["timeline"][-1]["at_s"] if t["timeline"] else None
        return t

    # ------------------------------------------------------------------ saving
    async def _save(self, pipeline_id: str, run_id: str, events: list, started: float) -> None:
        try:
            await asyncio.sleep(1.5)  # let the debug recording thread close its file
            async with self.lock:
                await self._save_locked(pipeline_id, run_id, events, started)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Alexa Recorder could not save run %s", run_id)

    async def _save_locked(self, pipeline_id: str, run_id: str, events: list, started: float) -> None:
        hass = self.hass
        t = self._parse(events)
        t["run_id"] = run_id
        t["pipeline_id"] = pipeline_id
        pipeline_name = pipeline_id
        try:
            from homeassistant.components.assist_pipeline import async_get_pipeline

            pipeline_name = async_get_pipeline(hass, pipeline_id).name
        except Exception:  # noqa: BLE001
            pass
        t["pipeline"] = pipeline_name
        device_name = "typed" if t["source"] == "typed" else "voice"
        if t["device_id"]:
            device_name = t["device_id"][:8]
            dev = dr.async_get(hass).async_get(t["device_id"])
            if dev:
                device_name = dev.name_by_user or dev.name or t["device_id"]
        elif t["satellite_id"]:
            device_name = t["satellite_id"].split(".")[-1]
        t["device"] = device_name
        local = dt_util.as_local(dt_util.utc_from_timestamp(started))
        t["time"] = local.isoformat(timespec="seconds")

        # Conversation grouping: same conversation id and recent -> same folder.
        cid = t["conversation_id"] or run_id
        conv = self.convs.get(cid)
        if conv and local - conv["last"] > self.gap:
            conv = None
        if conv is None:
            folder = self.root / local.strftime("%Y-%m-%d") / f"{local.strftime('%H-%M-%S')}_{_slug(device_name)}"
            conv = {"folder": folder, "turns": 0, "last": local}
            self.convs[cid] = conv
        conv["turns"] += 1
        conv["last"] = local
        turn = conv["turns"]
        folder: Path = conv["folder"]
        t["turn"] = turn
        t["folder"] = str(folder)
        prefix = f"turn{turn:02d}"

        files: dict[str, str] = {}
        # User audio from the debug recording folder.
        user_wav = await hass.async_add_executor_job(
            self._take_raw, t["device_id"], pipeline_name, started, folder, prefix
        )
        if user_wav:
            files["user_audio"] = user_wav
        # Assistant audio from the TTS proxy.
        if t["tts_url"] and t["tts"]:
            alexa = await self._fetch_tts(t["tts_url"], t["tts_mime"], folder, prefix)
            if alexa:
                files["alexa_audio"] = alexa
        t["files"] = files

        await hass.async_add_executor_job(self._write_turn, folder, prefix, t, events)
        await self._join_audio(folder)
        await hass.async_add_executor_job(self._write_transcript, folder)
        await hass.async_add_executor_job(self._append_index, t)

        hass.bus.async_fire(
            EVENT_SAVED,
            {
                "folder": str(folder),
                "turn": turn,
                "media_folder": "media-source://media_source/local/" + str(folder.relative_to("/media")) if str(folder).startswith("/media/") else None,
                "device_id": t["device_id"],
                "device": device_name,
                "source": t["source"],
                "question": t["heard"] if t["heard"] is not None else t["intent_input"],
                "answer": t["reply"],
                "error": t["error"],
                "tools": [c.get("tool") for c in t["tools"]],
                "conversation_id": t["conversation_id"],
                "run_id": run_id,
            },
        )

    def _take_raw(self, device_id: str | None, pipeline_name: str, started: float, folder: Path, prefix: str) -> str | None:
        folder.mkdir(parents=True, exist_ok=True)
        base = self.raw / (device_id or "") / pipeline_name if device_id else self.raw / pipeline_name
        if not base.is_dir():
            return None
        offset = time.time() - time.monotonic_ns() / 1e9
        best, best_d = None, 6.0
        for d in base.iterdir():
            if not d.is_dir() or str(d) in self.used_raw:
                continue
            try:
                wall = int(d.name) / 1e9 + offset
            except ValueError:
                continue
            diff = abs(wall - started)
            if diff < best_d:
                best, best_d = d, diff
        if best is None:
            return None
        self.used_raw.add(str(best))
        out = None
        for wav in sorted(best.glob("*.wav")):
            if wav.stat().st_size <= 44:
                wav.unlink(missing_ok=True)
                continue
            stage = "user" if "stt" in wav.name else wav.stem
            dest = folder / f"{prefix}_{stage}.wav"
            shutil.move(str(wav), dest)
            if stage == "user":
                out = dest.name
        try:
            best.rmdir()
        except OSError:
            pass
        # Remove empty leftovers older than an hour (typed runs make empty folders).
        for d in base.iterdir():
            try:
                if d.is_dir() and not any(d.iterdir()) and time.time() - d.stat().st_mtime > 3600:
                    d.rmdir()
            except OSError:
                pass
        return out

    async def _fetch_tts(self, url: str, mime: str | None, folder: Path, prefix: str) -> str | None:
        port = getattr(getattr(self.hass, "http", None), "server_port", None) or 8123
        ext = ".mp3" if (mime or "").endswith("mpeg") or url.endswith(".mp3") else (".flac" if url.endswith(".flac") else ".wav")
        for attempt in range(4):
            try:
                session = async_get_clientsession(self.hass, verify_ssl=False)
                async with session.get(f"http://127.0.0.1:{port}{url}", timeout=20) as resp:
                    if resp.status == 200:
                        body = await resp.read()
                        if len(body) > 100:
                            name = f"{prefix}_alexa{ext}"
                            await self.hass.async_add_executor_job(self._write_bytes, folder / name, body)
                            return name
                    _LOGGER.debug("TTS fetch %s returned %s", url, resp.status)
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("TTS fetch failed: %s", err)
            await asyncio.sleep(1 + attempt)
        return None

    @staticmethod
    def _write_bytes(path: Path, body: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)

    @staticmethod
    def _write_turn(folder: Path, prefix: str, t: dict, events: list) -> None:
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{prefix}.json").write_text(_dumps(t), encoding="utf-8")
        raw = [{"type": _etype(e), "data": getattr(e, "data", None), "timestamp": getattr(e, "timestamp", None)} for e in events]
        (folder / f"{prefix}_events.json").write_text(_dumps(raw), encoding="utf-8")

    async def _join_audio(self, folder: Path) -> None:
        parts = await self.hass.async_add_executor_job(self._audio_parts, folder)
        if not parts:
            return
        args = ["ffmpeg", "-y", "-loglevel", "error"]
        for p in parts:
            args += ["-i", str(p)]
        chains = "".join(f"[{i}:a]aresample=16000,aformat=sample_fmts=s16:channel_layouts=mono,apad=pad_dur=0.4[a{i}];" for i in range(len(parts)))
        joined = "".join(f"[a{i}]" for i in range(len(parts)))
        args += ["-filter_complex", f"{chains}{joined}concat=n={len(parts)}:v=0:a=1[out]", "-map", "[out]", str(folder / "conversation.wav")]
        try:
            proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
            _, err = await asyncio.wait_for(proc.communicate(), timeout=60)
            if proc.returncode:
                _LOGGER.warning("Alexa Recorder ffmpeg failed: %s", err.decode(errors="ignore")[:300])
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Alexa Recorder could not join audio: %s", err)

    @staticmethod
    def _audio_parts(folder: Path) -> list[Path]:
        parts: list[Path] = []
        for js in sorted(folder.glob("turn[0-9][0-9].json")):
            try:
                t = json.loads(js.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            for key in ("user_audio", "alexa_audio"):
                name = (t.get("files") or {}).get(key)
                if name and (folder / name).exists():
                    parts.append(folder / name)
        return parts

    @staticmethod
    def _write_transcript(folder: Path) -> None:
        lines: list[str] = []
        turns = sorted(folder.glob("turn[0-9][0-9].json"))
        first = None
        for js in turns:
            try:
                t = json.loads(js.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            first = first or t
            n = t.get("turn")
            heard = t.get("heard") if t.get("source") == "voice" else t.get("intent_input")
            lines.append(f"## Turn {n} · {t.get('time', '')[11:19]} · {t.get('source')}")
            lines.append("")
            lines.append(f"**{'Heard' if t.get('source') == 'voice' else 'Typed'}:** {heard!s}")
            lines.append("")
            for c in t.get("tools") or []:
                res = c.get("result")
                res_s = json.dumps(res, ensure_ascii=False, default=str) if res is not None else "(no result)"
                if len(res_s) > 600:
                    res_s = res_s[:600] + " …"
                lines.append(f"- Tool `{c.get('tool')}` args `{json.dumps(c.get('args'), ensure_ascii=False, default=str)}` → {res_s}")
            if t.get("tools"):
                lines.append("")
            lines.append(f"**Alexa:** {t.get('reply')!s}")
            if t.get("error"):
                lines.append(f"\n**Error:** {t.get('error')}")
            f = t.get("files") or {}
            audio = ", ".join(v for v in (f.get("user_audio"), f.get("alexa_audio")) if v) or "none"
            lines.append("")
            lines.append(
                f"_Audio: {audio}. Agent {t.get('agent')}, STT {t.get('stt_engine')}, "
                f"speech {t.get('vad', {}).get('stt-vad-start')}–{t.get('vad', {}).get('stt-vad-end')} ms, "
                f"turn took {t.get('duration_s')} s, local intent {t.get('processed_locally')}._"
            )
            shot = folder / f"turn{n:02d}_screen.png"
            if shot.exists():
                lines.append(f"\n![screen]({shot.name})")
            notes_f = folder / f"turn{n:02d}_notes.json"
            if notes_f.exists():
                try:
                    notes = json.loads(notes_f.read_text(encoding="utf-8"))
                    lines.append("\n**Review:**\n")
                    lines.append("```json\n" + json.dumps(notes, indent=2, ensure_ascii=False) + "\n```")
                except Exception:  # noqa: BLE001
                    pass
            lines.append("")
        if not first:
            return
        head = [
            f"# Conversation {first.get('time', '')[:10]} {first.get('time', '')[11:19]}",
            "",
            f"Device: {first.get('device')} · Pipeline: {first.get('pipeline')} · Turns: {len(turns)}"
            + (" · Full audio: conversation.wav" if (folder / "conversation.wav").exists() else ""),
            "",
        ]
        (folder / "transcript.md").write_text("\n".join(head + lines), encoding="utf-8")

    def _append_index(self, t: dict) -> None:
        row = {
            "time": t.get("time"), "folder": t.get("folder"), "turn": t.get("turn"),
            "device": t.get("device"), "source": t.get("source"),
            "heard": t.get("heard") if t.get("source") == "voice" else t.get("intent_input"),
            "reply": t.get("reply"), "error": t.get("error"),
            "tools": [c.get("tool") for c in t.get("tools") or []],
            "audio": bool((t.get("files") or {}).get("user_audio")),
        }
        self.root.mkdir(parents=True, exist_ok=True)
        with open(self.root / "index.jsonl", "a", encoding="utf-8") as fh:
            fh.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")

    # ------------------------------------------------------------------ notes service
    async def async_add_notes(self, call: ServiceCall) -> None:
        folder = Path(os.path.realpath(call.data["folder"]))
        root = Path(os.path.realpath(self.root))
        if root not in folder.parents:
            _LOGGER.warning("Alexa Recorder refused notes outside %s: %s", root, folder)
            return
        turn = int(call.data["turn"])
        payload = {"score": call.data.get("score"), "notes": call.data.get("notes"), "saved": dt_util.now().isoformat(timespec="seconds")}

        def _write() -> None:
            folder.mkdir(parents=True, exist_ok=True)
            (folder / f"turn{turn:02d}_notes.json").write_text(_dumps(payload), encoding="utf-8")
            self._write_transcript(folder)

        async with self.lock:
            await self.hass.async_add_executor_job(_write)
