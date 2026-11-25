#!/usr/bin/env node
// homelab MCP server (Nov 16 2026) - Owen's own tools for Claude, run by the Claude desktop app on the Zima
// (claude-desktop container). Claude adds tools here over time; see README.md next to this file.
// Every tool runs a FIXED, purpose-built command on the Zima host over SSH (user Harper, key below).
// Keep tools specific and mostly read-only; general shell access stays with the zima-ssh server and its approvals.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const nm = path.join(here, "..", "mcp", "node_modules");
const { McpServer } = await import(path.join(nm, "@modelcontextprotocol/sdk/dist/esm/server/mcp.js"));
const { StdioServerTransport } = await import(path.join(nm, "@modelcontextprotocol/sdk/dist/esm/server/stdio.js"));
const require = createRequire(path.join(nm, "x.js"));
const { z } = require("zod");
const { Client } = require("ssh2");

const HOST = process.env.HOMELAB_HOST || "192.168.6.170";
const USER = process.env.HOMELAB_USER || "Harper";
const KEY = process.env.HOMELAB_KEY || path.join(here, "..", "..", ".ssh", "id_ed25519");
const ADB = "/DATA/home/Harper/platform-tools/adb -s 192.168.4.44:5555";

function hostExec(cmd, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const c = new Client(); let out = "", done = false;
    const finish = (s) => { if (!done) { done = true; try { c.end(); } catch {} resolve(s); } };
    const t = setTimeout(() => finish(out + "\n[timed out]"), timeoutMs);
    c.on("ready", () => c.exec(cmd, (err, st) => {
      if (err) return finish("ssh exec error: " + err.message);
      st.on("data", (d) => { out += d; }).stderr.on("data", (d) => { out += d; });
      st.on("close", (code) => { clearTimeout(t); finish(out.trim() + (code ? `\n[exit ${code}]` : "")); });
    })).on("error", (e) => { clearTimeout(t); finish("ssh error: " + e.message); })
      .connect({ host: HOST, port: 22, username: USER, privateKey: readFileSync(KEY), readyTimeout: 15000 });
  });
}
const text = (s) => ({ content: [{ type: "text", text: String(s).slice(0, 60000) || "(no output)" }] });

const server = new McpServer({ name: "homelab", version: "1.0.0" });

server.tool("homelab_health", "Zima health: uptime, memory, /DATA disk, and whether the always-on services (Claude remote control, Alexa review trigger, Claude desktop watchdog, kitchen transcriber, Echo log collector) are running.", {},
  async () => text(await hostExec(
    "uptime; echo; free -m; echo; df -h /DATA | tail -1; echo; for u in claude-remote.service alexa-review-trigger.service claude-desktop-watchdog.timer; do printf '%s: ' $u; systemctl is-active $u; done; " +
    "printf 'kitchen transcriber: '; curl -s -m 5 http://127.0.0.1:8780/ping || echo down; echo; printf 'echo log collector: '; pgrep -f logcollect.py >/dev/null && echo running || echo down")));

server.tool("kitchen_listener_stats", "Kitchen listener (Echo Show 24/7 transcription) health from the Zima transcriber: clips today, minutes, errors, last text, model, Whisper busy time.", {},
  async () => text(await hostExec("curl -s -m 10 \"http://127.0.0.1:8780/stats?k=$(cat /DATA/home/Harper/alexa-review/state/trigger.key)\"")));

server.tool("kitchen_transcript", "Read the kitchen listener's transcript for a day (a day runs 4 AM to 4 AM). Returns the last N lines (time, Alexa state, text).",
  { day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD; default = the current listening day"), last: z.number().int().min(1).max(2000).optional().describe("how many lines, default 200") },
  async ({ day, last }) => {
    const d = day || new Date(Date.now() - 4 * 3600e3).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    return text(await hostExec(`tail -n ${last || 200} /DATA/home/Harper/kitchen-listen/text/${d}/day.jsonl 2>&1`));
  });

server.tool("echo_status", "Kitchen Echo Show (Android) status over adb: connected?, uptime, who is recording from the mic (VACA wake word + kitchen listener, and whether either is silenced), adb reverse ports, WebView devtools socket.", {},
  async () => text(await hostExec(
    `${ADB.split(" -s")[0]} connect 192.168.4.44:5555 >/dev/null 2>&1; ${ADB} shell uptime; echo; ${ADB} shell dumpsys audio | grep -E 'source client=.*silenced' | sed -E 's/ -- (patch|format|effects)[^-]*//g'; echo; ${ADB} reverse --list; echo; ${ADB} shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*'`)));

const PROBES = { listener: "q_osel.js", state: "q_state.js", check: "q_chk.js" };
server.tool("echo_page_probe", "Run one of the saved read-only probes in the Echo Show's dashboard page (WebView via CDP): listener = kitchen listener counters, state = os-echo state, check = general check.",
  { probe: z.enum(Object.keys(PROBES)) },
  async ({ probe }) => text(await hostExec(
    `S=$(${ADB} shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1); [ -n "$S" ] || { echo 'no WebView devtools socket'; exit 1; }; ${ADB} forward tcp:9222 localabstract:$S >/dev/null && cd /DATA/home/Harper/echo-cdp && python3 cdp.py 9222 ${PROBES[probe]}`)));

await server.connect(new StdioServerTransport());
