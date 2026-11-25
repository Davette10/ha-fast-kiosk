# Alexa news = Fox News like a real Alexa (Nov 11–12, 2026)

## Nov 12 (afternoon): no intro, Alexa+ style curation (current behaviour)
- **Owen's ask:** drop the spoken intro; Alexa says only "Here's your daily news." then plays a curated set of Fox News YouTube story videos, curated the way Amazon's Alexa does it.
- **How Amazon describes Alexa+ Daily Briefing (public sources; amazon.com help pages are robots-blocked):** "a breakdown of the latest trending news stories based on your interests" (aboutamazon.com), "summaries of the most popular recent stories" (BGR), topics can be tuned by voice (TechRadar). So: trending + recent + personal interests + no repeats.
- **os-echo-news.js `briefList`** (resource `f181935dab8441dc922f37beae4aa482`, sha256 bdc8d973…; backups `backups/os-echo-news-2026-11-12b.js`, `-12c.js`):
  - Candidates: Fox uploads (2 pages × 50) → `videos.list` (contentDetails, snippet, status, statistics). Keep 75–900 s, not live, embeddable, last 36 h.
  - Score = views / hours^0.8 (trending inside Fox), × (2 + 2×overlap) when the title overlaps ≥ 0.34 with YouTube's US News & Politics most-popular chart (trending across news), × 2.5 for family topics, × 0.35 opinion shows, × 0.7 for clips over 10 min.
  - Same-story dedupe (title overlap ≥ 0.5). Keep 8. Cache `osecho-brief2`, 20 min. Measured on the Echo: 1.27 s.
  - Intro screen wait: min 2.5 s, max 45 s (waits for Alexa to finish "Here's your daily news.").
- **Topics:** `todo.alexa_news_topics` (entry 01M77TF4EG77GS7GGWWAPR6AFK) via exposed `script.alexa_news_topics` ("Daily briefing topics": add / remove / list). E.g. "add the Panthers to my daily briefing". A topic only helps if Fox posted a clip about it in the last 36 h.
- **`script.alexa_play_news`:** kitchen say_first = "Here's your daily news." (note: say only that, don't list stories). Guard step: when called by the HA-MCP user (`47794e4f…`, used by Claude and the Zima review bot) it returns `test_only` and plays nothing — added after the review bot's text test played the briefing with sound.
- **Voice control:** `script.alexa_news_control` next / previous / stop / pause / resume → `sensor.echo_show` `news_cmd`.
- **Prompt v3.12** NEWS section matches. Verified: curation output, test_only guard, earlier volume-0 next/previous/stop. Not yet tested: a real "Alexa, play the news" with sound.

## Nov 12 (morning): first Alexa+ style briefing (superseded parts: intro wording, 48 h window)
- **What Owen saw on a stock Echo Dot / the Alexa app:**
  - "Play the news" gives a "daily briefing curated by Alexa".
  - Alexa first lists the topics, then plays short Fox News YouTube clips. Example: "Dem-elect REFUSES to call Iran an adversary".
  - It is Alexa+ Daily Briefings: an AI pick of trending stories from the chosen source. It is not Fox live TV.
- **Owen's asks:**
  - Say "Here's Fox News" out loud.
  - Less lag and buffering.
  - Sound on by default, with no mute button.
  - The same source Alexa uses.
- **os-echo-news.js** (resource `f181935dab8441dc922f37beae4aa482`; backup `backups/os-echo-news-2026-11-12.js`):
  - **Fetching:** briefing mode pulls the Fox News uploads playlist (`UU` + channel `UCXIJgqnII2ZOINSWNOGFThA`) with the YouTube Data API key `yt_key` from the alexa-dashboard config. It then checks `videos.list` for duration and embeddable.
  - **Filters:** 75–900 s long, not live, embeddable, from the last 48 h. Opinion shows are sorted after news; the OPINION regex covers Gutfeld, Watters, Hannity, Ingraham, The Five, Pirro, Gowdy, Levin and Tucker. Max 8 clips, cached 20 min in localStorage.
  - **Publishing:** every 20 min it sets `sensor.echo_show` attributes `news_brief` (titles) and `news_brief_ts`.
  - **Playback:**
    1. The intro screen "Your news briefing" lists 4 stories.
    2. It waits until the satellite stops talking (at least 4.5 s, at most 14 s).
    3. It plays the clips in order, unmuted, at quality `large` to cut buffering.
  - **Controls:** the Sound button was replaced by a "Live TV / News briefing" switch. Live TV mode is still there.
- **`script.alexa_play_news`:**
  - **Normal case:** in the kitchen, with `news_brief` less than 2 h old, it pauses the Echo music, sends `echo_cmd {panel:'news', ch:'briefing'}`, and returns `say_first` "Here's your Fox News briefing." plus the stories.
  - **Fallback:** otherwise it plays the hourly mp3 + Rundown audio below and says "Here's Fox News."
  - It keeps the already-playing check.
- **Prompt v3.10 NEWS:** say "Here's your Fox News briefing." and name the first 2–3 stories. The audio fallback says "Here's Fox News."
- **Verified:** `news_brief` holds 8 real Fox titles, and the harness test passed. **Not tested with sound** (no-audio rule in the kitchen). Never test "play the news" through the pipeline, because it plays video with sound.

## Request (Nov 11)
- **Owen's first ask (after his mom asked for the news at 6:31 PM):**
  - The kitchen Echo only said "Here is the latest news" and opened the live-TV screen.
  - All the other Echos played the news.
  - He wants it to play Fox News like a normal Alexa, from the start, with the intro music, not the live stream.
- **His add-on rule:** "If alexa is currently playing the news, don't stop it or change it at all."
- **His follow-up:** play the short Fox News Hourly Update first, "then go from there how alexa does it."
  - Amazon's long-form news (2019 AFTVnews/TechCrunch): "what's the news" plays a playlist of longer stories from the chosen publication. "Alexa, next/skip" moves between stories.

## Audio fallback (Nov 11)
- **Hourly update feed:** "Fox News Hourly Update" RSS `https://feeds.megaphone.fm/FOXM2252206613`. It holds only the latest newscast, about 5 minutes. The mp3 downloaded on Nov 11 was 299 s with no extra ad length.
- **Longer stories:** "The Fox News Rundown" RSS `https://feeds.feedburner.com/FromWashington`. Two episodes a day, 15–35 minutes each.
- **Scrape entries:**
  - Hourly update: `01M76FNYJV72H5XG5M6NTZQN2M` gives `sensor.fox_news_newscast_audio` and `sensor.fox_news_newscast_title`.
  - Rundown: `01M76G4NEV9QTMVQG0F6GQT7P6` gives `sensor.fox_news_rundown_audio_1`/`_2` and `sensor.fox_news_rundown_title_1`/`_2`.
- **Fallback path of `script.alexa_play_news`:**
  1. Updates the six sensors.
  2. If the kitchen player is already playing a newscast, it returns `already_playing` and changes nothing.
  3. Plays the hourly update mp3 with `music_assistant.play_media` (enqueue replace).
  4. Adds the 2 newest Rundown episodes (enqueue add).
  5. Opens the Music screen.
  6. Returns `newscast` plus `then` (the story titles).
  - "Next" in the Music player (or by voice) skips to the next story.
- "Play Fox News radio" still plays the live station. The live-TV News screen opens only for "watch on TV".

## Stop the other Echos that answer the same "Alexa"
- **Finding:** at 6:31 PM, alexa_media states stayed `idle` while the Echos played the flash briefing. Briefing playback is not reported as media. Amazon does update `last_called`, `last_called_timestamp` and `last_called_summary` within about 4–25 s.
- **Automation:** `automation.alexa_stop_other_echos_that_answer_the_kitchen`.
- **Trigger:** a `last_called_timestamp` change on Lauren, parents bedroom, Downstairs, Hayden's Echo Show, Harper echo dot, or Harper's room Echo Dot with Clock.
- **Conditions (all must hold):**
  - That Echo has `last_called` true and the call is less than 60 s old.
  - The kitchen satellite is not idle, or changed state less than 40 s ago.
  - The summary is not a stop/cancel/off/volume command.
  - The summary shares a meaningful word with the kitchen STT, or contains "news".
- **Action:** wait 2 s, then `media_player.play_media` custom "stop" on that Echo, plus a logbook line.
- **Never touched:** the kitchen Echo Show, TVs, Everywhere, This Device.
- **Risk:** `last_called_summary` sometimes reads "off". If summaries are unreliable, the automation won't fire.
  - The clean alternative is Owen changing the other Echos' wake word (Alexa app → Device → Wake Word, e.g. "Echo" or "Ziggy") so they don't answer "Alexa" at all.

## Not yet tested with sound
- Owen to test with "Alexa, what's the news?"
- **If Music Assistant refuses the URL**, use the MA podcast item `spotify--ALGygtid://podcast/6IXn2rWLGMcVVEOELvA8Hw` (ad-free: `48iUi7a5lrGD0Q94xiInuN`).
