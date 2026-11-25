#!/usr/bin/env python3
"""Build an Echo-Dot-style firmware config for Harper's Voice PE from the official 26.9.0 source.

Reads  src/home-assistant-voice.yaml + src/home-assistant-voice.factory.yaml (untouched upstream files)
Writes src/alexa-voice.yaml (patched base) and src/alexa-dot.yaml (top-level config to compile).

Changes (everything else is the stock firmware):
  * sounds: Owen's own Echo sounds (wake, end of listening, mic off / on, volume, timer, error)
  * wake word: adds the on-device microWakeWord "alexa" model
  * light ring: Alexa-style animations (blue ring with a cyan arc on wake, spinning cyan/blue while
    thinking, cyan/blue pulse while speaking, solid red when the mic is off, white volume arc,
    spinning cyan arc while a timer rings)
"""
import re, sys
D = "/DATA/home/Harper/voicepe-fw/"
S = D + "alexa-sounds/"
base = open(D + "src/home-assistant-voice.yaml").read()
fac = open(D + "src/home-assistant-voice.factory.yaml").read()

def sub1(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        sys.exit(f"expected {count} x {old[:70]!r}, found {n}")
    return text.replace(old, new)

# ---------- sounds ----------
for key, f in [("wake_word_triggered_sound_file", "wake"), ("mute_switch_on_sound_file", "mute_on"),
               ("mute_switch_off_sound_file", "mute_off"), ("timer_finished_sound_file", "timer"),
               ("center_button_press_sound_file", "wake")]:
    base, n = re.subn(rf"(\n  {key}: )\S+", rf"\g<1>{S}{f}.flac", base)
    if n != 1:
        sys.exit("substitution not found: " + key)

base = sub1(base, "  - id: wake_word_triggered_sound\n    file: ${wake_word_triggered_sound_file}\n",
            "  - id: wake_word_triggered_sound\n    file: ${wake_word_triggered_sound_file}\n"
            f"  - id: alexa_end_sound\n    file: {S}end.flac\n"
            f"  - id: alexa_volume_sound\n    file: {S}volume.flac\n"
            f"  - id: alexa_error_sound\n    file: {S}error.flac\n")

# end-of-listening tone (Echo "end of request" sound), only when the wake sound switch is on
base = sub1(base, "  on_stt_vad_end:\n    - lambda: id(voice_assistant_phase) = ${voice_assist_thinking_phase_id};\n    - script.execute: control_leds\n",
            "  on_stt_vad_end:\n    - lambda: id(voice_assistant_phase) = ${voice_assist_thinking_phase_id};\n    - script.execute: control_leds\n"
            "    - if:\n        condition:\n          switch.is_on: wake_sound\n        then:\n"
            "          - script.execute:\n              id: play_sound\n              priority: false\n              sound_file: \"alexa_end_sound\"\n")

# error tone when the error light shows
base = sub1(base, "          - lambda: id(voice_assistant_phase) = ${voice_assist_error_phase_id};\n          - script.execute: control_leds\n",
            "          - lambda: id(voice_assistant_phase) = ${voice_assist_error_phase_id};\n          - script.execute: control_leds\n"
            "          - script.execute:\n              id: play_sound\n              priority: false\n              sound_file: \"alexa_error_sound\"\n")

# volume "boop" on every volume change (dial or Home Assistant), not while booting
base = sub1(base, "    on_volume:\n      - script.execute: control_leds\n",
            "    on_volume:\n      - script.execute: control_leds\n"
            "      - if:\n          condition:\n            lambda: return !id(init_in_progress);\n          then:\n"
            "            - script.execute:\n                id: play_sound\n                priority: false\n                sound_file: \"alexa_volume_sound\"\n")

# ---------- wake word ----------
base = sub1(base, "    - model: hey_mycroft\n      id: hey_mycroft\n",
            "    - model: hey_mycroft\n      id: hey_mycroft\n    - model: alexa\n      id: alexa\n")

# ---------- light ring ----------
COL = ("            const Color BLUE(0, 24, 255);\n"
       "            const Color CYAN(0, 205, 255);\n")
FX = {
"Waiting for Command": ("30ms", COL + """            static uint8_t step = 0;
            if (initial_run) step = 0;
            // the ring fills with blue from the front in both directions, then holds with the cyan arc
            for (uint8_t i = 0; i < 12; i++) {
              uint8_t d = (i <= 6) ? i : 12 - i;   // distance from LED 0
              if (d <= 1) it[i] = CYAN;
              else if (d <= step) it[i] = BLUE;
              else it[i] = Color::BLACK;
            }
            if (step < 6) step++;"""),
"Listening For Command": ("50ms", COL + """            for (uint8_t i = 0; i < 12; i++) {
              uint8_t d = (i <= 6) ? i : 12 - i;
              it[i] = (d <= 1) ? CYAN : BLUE;
            }"""),
"Thinking": ("90ms", COL + """            static uint8_t offset = 0;
            // alternating cyan and blue blocks spinning round the ring
            for (uint8_t i = 0; i < 12; i++) {
              it[i] = (((i + offset) / 2) % 2) ? CYAN : BLUE;
            }
            offset = (offset + 1) % 12;"""),
"Replying": ("20ms", COL + """            static uint16_t t = 0;
            if (initial_run) t = 0;
            // the whole ring pulses between blue and cyan while Alexa talks
            float k = 0.5f - 0.5f * cosf(t * 2.0f * 3.14159f / 50.0f);
            Color c(0, (uint8_t)(BLUE.g + (CYAN.g - BLUE.g) * k), 255);
            for (uint8_t i = 0; i < 12; i++) it[i] = c;
            t = (t + 1) % 50;"""),
"Error": ("30ms", COL + """            static uint8_t step = 0;
            if (initial_run) step = 0;
            // a short blue fade-out (an Echo just goes dark and plays its error tone)
            uint8_t level = step < 30 ? 255 - step * 8 : 0;
            for (uint8_t i = 0; i < 12; i++) it[i] = BLUE * level;
            if (step < 30) step++;"""),
"Muted or Silent": ("16ms", """            Color muted_color(255, 0, 0);
            auto light_color = id(led_ring).current_values;
            Color color(light_color.get_red() * 255, light_color.get_green() * 255,
                  light_color.get_blue() * 255);
            for (uint8_t i = 0; i < 12; i++) {
              it[i] = light_color.get_state() ? color : Color::BLACK;
            }
            if ( id(master_mute_switch).state ) {
              // microphone off: solid red ring, like an Echo
              for (uint8_t i = 0; i < 12; i++) it[i] = muted_color;
            } else if ( id(external_media_player).volume == 0.0f || id(external_media_player).is_muted() ) {
              it[5] = Color::BLACK;
              it[6] = muted_color;
              it[7] = Color::BLACK;
            }"""),
"Volume Display": ("50ms", """            // white arc that grows with the volume, like an Echo
            Color color(255, 255, 255);
            Color silenced_color(255, 0, 0);
            auto volume_ratio = 12.0f * id(external_media_player).volume;
            for (uint8_t i = 0; i < 12; i++) {
              if (i <= volume_ratio) {
                it[(6+i)%12] = color * min( 255.0f * (volume_ratio - i) , 255.0f ) ;
              } else {
                it[(6+i)%12] = Color::BLACK;
              }
            }
            if (id(external_media_player).volume == 0.0f) {
              it[6] = silenced_color;
            }"""),
"Timer Ring": ("60ms", COL + """            static uint8_t pos = 0;
            Color muted_color(255, 0, 0);
            // a cyan arc spinning round a blue ring while the timer rings
            for (uint8_t i = 0; i < 12; i++) {
              uint8_t d = (i + 12 - pos) % 12;
              it[i] = (d < 3) ? CYAN : BLUE * 140;
            }
            if ( id(master_mute_switch).state ) {
              it[3] = muted_color;
              it[9] = muted_color;
            }
            pos = (pos + 1) % 12;"""),
}

for name, (interval, body) in FX.items():
    pat = re.compile(r"      - addressable_lambda:\n          name: \"" + re.escape(name) + r"\"\n.*?(?=\n      - |\n\n)", re.S)
    lam = "\n".join("            " + l.lstrip() if False else l for l in body.split("\n"))
    new = (f"      - addressable_lambda:\n          name: \"{name}\"\n          update_interval: {interval}\n"
           f"          lambda: |-\n{lam}")
    base, n = pat.subn(lambda m: new, base)
    if n != 1:
        sys.exit(f"effect {name}: {n} matches")

open(D + "src/alexa-voice.yaml", "w").write(base)

# ---------- top-level config (factory file, pointing at the patched base) ----------
fac = sub1(fac, "  home-assistant-voice: !include home-assistant-voice.yaml", "  home-assistant-voice: !include alexa-voice.yaml")
fac = sub1(fac, "    version: dev", "    version: 26.9.0-alexa")
open(D + "src/alexa-dot.yaml", "w").write(fac)
print("ok", len(base), len(fac))
