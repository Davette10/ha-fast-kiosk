# Alexa backup brain + web search (Nov 11, 2026) — LIVE

## Why
- On Nov 10 Google returned a 503 ("high demand") and the raw error was read aloud.
  - HA has no built-in fallback when an LLM agent errors.
  - `m50/ha-fallback-conversation` is archived (Dec 2024) and only handles "intent not handled", so it wasn't used.
- Live web answers: Gemini 3 "Grounding with Google Search" is not available on the free tier (https://ai.google.dev/gemini-api/docs/pricing).
  - The paid tier gives 5,000 prompts/month, then $14 per 1,000.
  - `script.search_google` gets a 429 and stays unexposed. gemini-2.5-flash returns 404 for new users.
  - Groq Compound has been removed (Oct 2026). OpenRouter web search uses paid credits.

## Custom integration `alexa_helper` 1.0.0 (written by Claude)
- Source is `outputs/ha/alexa_helper/`; the zip is at `Desktop/ha/alexa_helper.zip`.
- Owen copied it to `/config/custom_components/alexa_helper` with Studio Code Server. Claude restarted HA on Nov 11.
- Config entry `01M74HPHZ6VM9X6QGNV1SKBRP4`. Options (Configure): main agent, backup 1, backup 2, timeout 30 s, failure sentence, Tavily key (password field; Owen enters it himself).
- **`conversation.alexa_with_backup` ("Alexa (with backup)")** calls `conversation.async_converse` on each agent in order.
  - It passes the same conversation_id, device_id and satellite_id.
  - A failure is any of: an ERROR response (unknown or failed_to_handle), an exception, a timeout, or error text such as "problem talking to", "RESOURCE_EXHAUSTED" or "high demand".
  - If every agent fails it says the failure sentence.
  - Attributes: last_agent, last_used_backup, last_errors, last_seconds. Event: `alexa_helper_answered`.
  - No streaming.
- **`alexa_helper.web_search`** (query, topic general|news, max_results) is response-only.
  - It uses Tavily when a key is set (free 1,000 searches/month, no card; basic search = 1 credit).
  - Without a key it uses Google News RSS, Wikipedia REST and DuckDuckGo instant answers.

## Verified Nov 11 (text only)
- The main agent answered: "Three quarters of a cup is twelve tablespoons".
- **Fallback:** primary was temporarily set to `conversation.google_search_echo`.
  - That agent returned Google's 429 quota error; it was caught and backup 1 answered in 1.2 s.
  - The primary was restored afterwards.
- **Pipeline:** "Who won the World Series this year?" → the agent called `script.alexa_web_search` and answered "The Milwaukee Brewers won the World Series, defeating the Tampa Bay Rays in five games."

## Agents
- **Main:** `conversation.google_ai_conversation`, subentry `01M1MTZF6HEBV2SPV45ZGXBTQQ`, gemini-3.5-flash-lite, prompt **v3.8** (`outputs/ha/gemini-prompt-v3.8.txt`).
  - The previous live prompt is saved as `gemini-prompt-v3.7-live-2026-11-11.txt`.
- **Backup 1:** `conversation.alexa_backup_gemini_3_1_flash_lite`, subentry `01M74FGJEB96S39B5QB5T47SKV`, gemini-3.1-flash-lite (separate free quota). It has the same prompt v3.8 and the same options.
- **Backup 2:** `conversation.free_models_router`, OpenRouter subentry `01M74FHA0VHHHVBFQGHWSX5629`, `openrouter/free`, Assist API, short voice prompt.
- **Pipeline "Gemini Assist"** `01m1mv4wd92910191722ek9eyr`: conversation_engine = `conversation.alexa_with_backup`, prefer_local_intents on.
- **Prompt v3.8 changes:**
  - OTHER QUESTIONS: use "Look it up online" first for anything current; say how recent it is; never read links.
  - Recipes: don't search.
- **Keep prompts in sync:** main and backup 1 must have the same prompt. The Zima review `CLAUDE.md` states this rule.
- `script.alexa_web_search` ("Look it up online", fields query/topic) is exposed to Assist.

## Timer countdown (os-echo, Nov 11)
- A new View Assist timer sets `_tmPend`.
- When the satellite is idle and the island shows the glance or a short answer (shown more than 2.2 s, under 110 characters), the Timers island opens for 15 s.
- A single timer gets a large 46vh ring labelled "7 minute timer". After that the glance pill keeps counting down.
- os-echo resource `9347e79764e44f0fafd26fd239d93056`, 126,871 B, sha256 `f766fb71…`. Verified loaded on the Echo via CDP.
- The devtools socket name changes after a VACA restart. Find it with `adb shell grep -a devtools /proc/net/unix`.
