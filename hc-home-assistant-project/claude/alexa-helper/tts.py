"""Alexa voice for the kitchen Echo Show, level-matched to everything else it plays (Nov 24 2026, Claude).

Owen: "match all media, volume, mute, wake sound, ALL sfx to be equal volume", then chose a voice gain stage.

Everything on the Echo's media stream (news, music, sound effects) is matched to -25 LUFS. Alexa's voice is Piper
(tts.piper_3, about -12.3 LUFS) and plays on Android's notification stream, which only has 7 coarse steps. This entity
runs Piper unchanged and turns its audio down digitally by exactly the gap for the Echo's current volume:

    gain = (TARGET + curve(media index)) - (PIPER_LUFS + curve(voice index))    clamped to [-40, 0] dB

It never boosts. 'Echo Show - Sync volume sliders' keeps the voice index at or above what is needed, so the gain is
0 to -20 dB. If anything here fails, the audio passes through unchanged (as loud as before, never louder).
Only the Echo Show's own pipeline ("Gemini Assist (Echo Show)") uses this entity; other speakers keep tts.piper_3.
"""
from __future__ import annotations

import array
import dataclasses
import logging
import sys
from collections.abc import AsyncGenerator
from typing import Any

from homeassistant.components.tts import TextToSpeechEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.entity_platform import AddEntitiesCallback

_LOGGER = logging.getLogger(__name__)

SOURCE = "tts.piper_3"
VOICE = "en_US-alexa-medium"
MUSIC = "number.vaca_amzn_echo_show_8_3a31_music_volume"  # Android STREAM_MUSIC, 0-15
SPEECH = "number.vaca_amzn_echo_show_8_3a31_voice_volume"  # Android STREAM_NOTIFICATION, 0-7
TARGET = -25.0  # LUFS of everything on the media stream (news, music, sound effects)
PIPER_LUFS = -12.3  # measured Nov 24 on six cached replies (-11.9 to -12.5)
GAIN_OPT = "gain_db"
# Echo Show 8 speaker volume curve (dumpsys media.audio_policy, the same for both streams): (percent, dB)
CURVE = ((1, -58.0), (20, -40.0), (60, -17.0), (100, 0.0))


def _curve_db(index: float, steps: int) -> float:
    """Android volIndexToDb for the speaker: index -> percent (integer division) -> dB."""
    i = int(index)
    if i <= 0:
        return -96.0
    p = max(1, (100 * i) // steps)
    for (x0, y0), (x1, y1) in zip(CURVE, CURVE[1:]):
        if p <= x1:
            return y0 + (p - x0) * (y1 - y0) / (x1 - x0)
    return 0.0


def _num(hass: HomeAssistant, entity_id: str) -> float | None:
    st = hass.states.get(entity_id)
    try:
        return float(st.state) if st else None
    except (TypeError, ValueError):
        return None


def level_gain_db(media: float | None, voice: float | None) -> float:
    if media is None or voice is None or media <= 0 or voice <= 0:
        return 0.0
    g = (TARGET + _curve_db(media, 15)) - (PIPER_LUFS + _curve_db(voice, 7))
    return round(max(-40.0, min(0.0, g)), 1)


def _wav_data(buf: bytes) -> tuple[int, int] | None:
    """(offset of the PCM data, bits per sample) for a RIFF/WAVE header, or None if incomplete."""
    if len(buf) < 12 or buf[:4] != b"RIFF" or buf[8:12] != b"WAVE":
        return None
    pos, bits = 12, 16
    while pos + 8 <= len(buf):
        cid, size = buf[pos:pos + 4], int.from_bytes(buf[pos + 4:pos + 8], "little")
        if cid == b"fmt " and pos + 24 <= len(buf):
            bits = int.from_bytes(buf[pos + 22:pos + 24], "little")
        if cid == b"data":
            return pos + 8, bits
        pos += 8 + size + (size & 1)
    return None


def _scale(pcm: bytes, factor: float) -> bytes:
    a = array.array("h")
    a.frombytes(pcm)
    if sys.byteorder == "big":
        a.byteswap()
    b = array.array("h", [int(x * factor) for x in a])
    if sys.byteorder == "big":
        b.byteswap()
    return b.tobytes()


def scale_wav(data: bytes, factor: float) -> bytes:
    hd = _wav_data(data)
    if not hd or hd[1] != 16:
        return data
    off = hd[0]
    n = (len(data) - off) // 2 * 2
    return data[:off] + _scale(data[off:off + n], factor) + data[off + n:]


async def _scaled_stream(src: AsyncGenerator[bytes, None], factor: float) -> AsyncGenerator[bytes, None]:
    """Scale a streamed WAV (header first, possibly a new header per sentence) or raw 16-bit PCM."""
    carry, head, passthru = b"", b"", False
    async for chunk in src:
        if passthru or not chunk:
            yield chunk
            continue
        if head or chunk[:4] == b"RIFF":
            head += chunk
            hd = _wav_data(head)
            if hd is None:
                if len(head) > 4096:  # not a header we understand: stop touching the audio
                    passthru = True
                    yield head
                    head = b""
                continue
            off, bits = hd
            yield head[:off]
            chunk, head, carry = head[off:], b"", b""
            if bits != 16:
                passthru = True
                yield chunk
                continue
        data = carry + chunk
        n = len(data) // 2 * 2
        carry = data[n:]
        if n:
            yield _scale(data[:n], factor)
    if head:
        yield head
    if carry:
        yield carry


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([EchoVoiceTTS(hass, entry)])


class EchoVoiceTTS(TextToSpeechEntity):
    _attr_has_entity_name = False
    _attr_name = "Alexa voice Echo Show"
    _attr_icon = "mdi:account-voice"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._attr_unique_id = f"{entry.entry_id}-echo-voice-tts"

    def _src(self) -> TextToSpeechEntity | None:
        for comp in list(self.hass.data.values()):
            if isinstance(comp, EntityComponent) and comp.domain == "tts":
                ent = comp.get_entity(SOURCE)
                if ent is not None:
                    return ent  # type: ignore[return-value]
        return None

    # ----- capabilities follow Piper -----
    @property
    def default_language(self) -> str:
        s = self._src()
        return s.default_language if s else "en_US"

    @property
    def supported_languages(self) -> list[str]:
        s = self._src()
        return list(s.supported_languages) if s else ["en_US"]

    @property
    def supported_options(self) -> list[str]:
        s = self._src()
        return list((s.supported_options or []) if s else ["voice"]) + [GAIN_OPT]

    @property
    def default_options(self) -> dict[str, Any]:
        # the gain is an option, so Home Assistant's TTS cache keeps a separate copy per volume level
        return {"voice": VOICE, GAIN_OPT: level_gain_db(_num(self.hass, MUSIC), _num(self.hass, SPEECH))}

    def async_get_supported_voices(self, language: str):
        s = self._src()
        return s.async_get_supported_voices(language) if s else None

    def async_supports_streaming_input(self) -> bool:
        s = self._src()
        try:
            return bool(s and s.async_supports_streaming_input())
        except Exception:  # noqa: BLE001
            return False

    # ----- synthesis -----
    def _split(self, options: dict[str, Any] | None) -> tuple[dict[str, Any], float]:
        opts = dict(options or {})
        g = opts.pop(GAIN_OPT, None)
        try:
            g = float(g) if g is not None else level_gain_db(_num(self.hass, MUSIC), _num(self.hass, SPEECH))
        except (TypeError, ValueError):
            g = 0.0
        g = max(-40.0, min(0.0, g))
        return opts, 10 ** (g / 20)

    async def async_get_tts_audio(self, message: str, language: str, options: dict[str, Any]):
        src = self._src()
        if src is None:
            _LOGGER.error("%s not found", SOURCE)
            return None, None
        opts, factor = self._split(options)
        ext, data = await src.async_get_tts_audio(message, language, opts)
        if not data or factor >= 0.999 or (ext or "").lower() != "wav":
            return ext, data
        try:
            return ext, scale_wav(data, factor)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("voice gain failed; playing unchanged")
            return ext, data

    async def async_stream_tts_audio(self, request):
        src = self._src()
        if src is None:
            return await super().async_stream_tts_audio(request)
        opts, factor = self._split(request.options)
        resp = await src.async_stream_tts_audio(dataclasses.replace(request, options=opts))
        if factor >= 0.999 or (getattr(resp, "extension", "wav") or "").lower() != "wav":
            return resp
        return dataclasses.replace(resp, data_gen=_scaled_stream(resp.data_gen, factor))
