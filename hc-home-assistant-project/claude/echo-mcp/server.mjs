#!/usr/bin/env node
// echo MCP server (Nov 24 2026, Claude) - full control of the kitchen Echo Show 8 (LineageOS 18.1) for Claude.
// Owen gave full, unrestricted access. Runs on the Zima host, where adb lives:
//  - Claude desktop on Owen's PC: `ssh Harper@zima node <this file>` (stdio).
//  - Claude desktop in the Zima's claude-desktop container: adb is not visible there, so this file bridges itself
//    to the host over SSH (ssh2, same key as the homelab server) and the real server runs on the host.
// Every call is logged to /DATA/home/Harper/echo-mcp/calls.log. See README.md next to this file.
import { createRequire } from "node:module";
import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const nm = path.join(here, "..", "mcp", "node_modules");
const require = createRequire(path.join(nm, "x.js"));

const ADB_BIN = process.env.ECHO_ADB || "/DATA/home/Harper/platform-tools/adb";
const SERIAL = process.env.ECHO_SERIAL || "192.168.4.44:5555";
const HOST = process.env.ECHO_MCP_HOST || "192.168.6.170";
const HOST_NODE = "/DATA/AppData/claude-desktop/config/.local/node/bin/node";
const HOST_SELF = "/DATA/AppData/claude-desktop/config/.local/echo/server.mjs";
const LOG_DIR = "/DATA/home/Harper/echo-mcp";
const CDP_PORT = 9333;

/* ---------- bridge mode (inside the claude-desktop container) ---------- */
if (!existsSync(ADB_BIN)) {
  const { Client } = require("ssh2");
  const key = readFileSync(process.env.ECHO_MCP_KEY || path.join(here, "..", "..", ".ssh", "id_ed25519"));
  const c = new Client();
  c.on("ready", () => c.exec(`${HOST_NODE} ${HOST_SELF}`, (err, st) => {
    if (err) { process.stderr.write("echo-mcp bridge: " + err.message + "\n"); process.exit(1); }
    process.stdin.pipe(st); st.pipe(process.stdout); st.stderr.pipe(process.stderr);
    st.on("close", () => { c.end(); process.exit(0); });
    process.stdin.on("end", () => st.end());
  })).on("error", (e) => { process.stderr.write("echo-mcp bridge ssh: " + e.message + "\n"); process.exit(1); })
    .connect({ host: HOST, port: 22, username: "Harper", privateKey: key, readyTimeout: 15000, keepaliveInterval: 30000 });
} else {
  await main();
}

async function main() {
  const { McpServer } = await import(path.join(nm, "@modelcontextprotocol/sdk/dist/esm/server/mcp.js"));
  const { StdioServerTransport } = await import(path.join(nm, "@modelcontextprotocol/sdk/dist/esm/server/stdio.js"));
  const { z } = require("zod");
  try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  const log = (o) => { try { appendFileSync(path.join(LOG_DIR, "calls.log"), JSON.stringify({ t: new Date().toISOString(), ...o }).slice(0, 4000) + "\n"); } catch {} };

  /* ---------- process helpers ---------- */
  function run(argv, { input, timeout = 60000 } = {}) {
    return new Promise((resolve) => {
      const p = spawn(argv[0], argv.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
      const out = [], err = []; let killed = false;
      const t = setTimeout(() => { killed = true; try { p.kill("SIGKILL"); } catch {} }, timeout);
      p.stdout.on("data", (d) => out.push(d)); p.stderr.on("data", (d) => err.push(d));
      p.on("error", (e) => { clearTimeout(t); resolve({ code: -1, out: Buffer.alloc(0), err: e.message, killed }); });
      p.on("close", (code) => { clearTimeout(t); resolve({ code, out: Buffer.concat(out), err: Buffer.concat(err).toString(), killed }); });
      if (input != null) p.stdin.end(input); else p.stdin.end();
    });
  }
  const NO_SERIAL = new Set(["connect", "disconnect", "devices", "kill-server", "start-server", "version", "pair", "mdns"]);
  async function adb(args, opts = {}) {
    const argv = NO_SERIAL.has(args[0]) ? [ADB_BIN, ...args] : [ADB_BIN, "-s", SERIAL, ...args];
    let r = await run(argv, opts);
    if (/device .*not found|device offline|no devices|closed|cannot connect/i.test(r.err) && !opts._retried) {
      await run([ADB_BIN, "connect", SERIAL], { timeout: 15000 });
      await new Promise((s) => setTimeout(s, 1000));
      r = await run(argv, opts);
    }
    return r;
  }
  let rootChecked = 0;
  async function ensureRoot() {
    if (Date.now() - rootChecked < 60000) return;
    const id = await adb(["shell", "id", "-u"], { timeout: 15000 });
    if (id.out.toString().trim() !== "0") {
      await adb(["root"], { timeout: 20000 });
      await new Promise((s) => setTimeout(s, 3000));
      await run([ADB_BIN, "connect", SERIAL], { timeout: 15000 });
    }
    rootChecked = Date.now();
  }
  const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
  const text = (s) => ({ content: [{ type: "text", text: String(s).slice(0, 100000) || "(no output)" }] });
  const fmt = (r) => [r.out.toString(), r.err && r.err.trim() ? "[stderr] " + r.err.trim() : "", r.killed ? "[timed out]" : "", r.code ? `[exit ${r.code}]` : ""].filter(Boolean).join("\n");

  /* ---------- CDP (the Echo's WebView: the screen page) ---------- */
  async function cdpTarget() {
    const u = await adb(["shell", "cat", "/proc/net/unix"], { timeout: 15000 });
    const socks = [...new Set((u.out.toString().match(/webview_devtools_remote_\d+/g) || []))];
    if (!socks.length) throw new Error("no WebView devtools socket (is the VACA app running?)");
    for (const s of socks) {
      await adb(["forward", `tcp:${CDP_PORT}`, `localabstract:${s}`], { timeout: 15000 });
      try {
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
        const page = list.find((x) => x.type === "page");
        if (page) return page;
      } catch {}
    }
    throw new Error("no page target found on " + socks.join(", "));
  }
  /* one DevTools session; runs the commands in order (so e.g. Performance.enable + Performance.getMetrics work together) */
  async function cdpSession(cmds, timeoutMs = 60000) {
    const page = await cdpTarget();
    const ws = new WebSocket(page.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://127.0.0.1:${CDP_PORT}`));
    const results = [];
    return await new Promise((resolve, reject) => {
      const t = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("CDP timeout")); }, timeoutMs);
      const next = () => { if (results.length === cmds.length) { clearTimeout(t); ws.close(); return resolve({ page, results }); } const c = cmds[results.length]; ws.send(JSON.stringify({ id: results.length + 1, method: c.method, params: c.params || {} })); };
      ws.onerror = () => { clearTimeout(t); reject(new Error("CDP websocket error")); };
      ws.onopen = next;
      ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === results.length + 1) { results.push({ result: d.result, error: d.error }); next(); } };
    });
  }
  async function cdpCall(method, params = {}, timeoutMs = 60000) {
    const r = await cdpSession([{ method, params }], timeoutMs);
    return { page: r.page, result: r.results[0].result, error: r.results[0].error };
  }

  const server = new McpServer({ name: "echo", version: "1.1.0" });
  const tool = (name, desc, shape, fn) => server.tool(name, desc, shape, async (a) => {
    const t0 = Date.now();
    try { const r = await fn(a); log({ tool: name, args: a, ms: Date.now() - t0 }); return r; }
    catch (e) { log({ tool: name, args: a, ms: Date.now() - t0, error: String(e.message || e) }); return text("error: " + (e.message || e)); }
  });

  tool("echo_shell",
    "Run a shell script on the kitchen Echo Show 8 (LineageOS 18.1, Android 11, MT8163) over adb. Multi-line scripts, pipes, variables and quotes all work (the script is sent on stdin to `sh`). Runs as root by default (adbd root). Returns stdout, stderr and the exit code.",
    { script: z.string().describe("Shell script to run on the Echo (toybox sh)."), timeout_s: z.number().min(1).max(1800).optional().describe("Default 60."), as_root: z.boolean().optional().describe("Default true. false runs as the adb shell user (uid 2000) - only matters if root is off.") },
    async ({ script, timeout_s, as_root }) => {
      if (as_root !== false) await ensureRoot();
      return text(fmt(await adb(["shell", "sh", "-s"], { input: script + "\n", timeout: (timeout_s || 60) * 1000 })));
    });

  tool("echo_adb",
    "Run any adb host command against the Echo (serial added automatically), e.g. [\"install\",\"-r\",\"/DATA/.../app.apk\"], [\"reboot\"], [\"reboot\",\"recovery\"], [\"forward\",\"--list\"], [\"reverse\",...], [\"root\"], [\"unroot\"], [\"remount\"], [\"bugreport\",\"/DATA/.../br.zip\"], [\"disable-verity\"]. Paths are on the Zima host.",
    { args: z.array(z.string()).min(1), timeout_s: z.number().min(1).max(1800).optional().describe("Default 120.") },
    async ({ args, timeout_s }) => { if (args[0] === "root" || args[0] === "unroot") rootChecked = 0; return text(fmt(await adb(args, { timeout: (timeout_s || 120) * 1000 }))); });

  tool("echo_read_file",
    "Read a file from the Echo (as root). Text by default; encoding base64 for binary files.",
    { path: z.string(), encoding: z.enum(["text", "base64"]).optional(), max_bytes: z.number().int().min(1).max(20000000).optional().describe("Default 2,000,000.") },
    async ({ path: p, encoding, max_bytes }) => {
      await ensureRoot();
      const r = await adb(["exec-out", "cat " + shq(p)], { timeout: 120000 });
      if (r.code && !r.out.length) return text(fmt(r));
      const buf = r.out.subarray(0, max_bytes || 2000000);
      const note = r.out.length > buf.length ? `\n[truncated: ${r.out.length} bytes total]` : "";
      return text((encoding === "base64" ? buf.toString("base64") : buf.toString("utf8")) + note);
    });

  tool("echo_write_file",
    "Write a file on the Echo (as root), any size, text or base64. Creates parent folders. Optional chmod mode (e.g. \"644\") and owner (e.g. \"system:system\"). For files already on the Zima use echo_transfer.",
    { path: z.string(), content: z.string(), encoding: z.enum(["text", "base64"]).optional(), mode: z.string().regex(/^[0-7]{3,4}$/).optional(), owner: z.string().regex(/^[a-z0-9_]+(:[a-z0-9_]+)?$/).optional() },
    async ({ path: p, content, encoding, mode, owner }) => {
      await ensureRoot();
      const data = encoding === "base64" ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
      const dir = path.posix.dirname(p);
      const r = await adb(["shell", `mkdir -p ${shq(dir)} && cat > ${shq(p)}` + (mode ? ` && chmod ${mode} ${shq(p)}` : "") + (owner ? ` && chown ${owner} ${shq(p)}` : "") + ` && ls -l ${shq(p)}`], { input: data, timeout: 300000 });
      return text(fmt(r) + `\n(${data.length} bytes sent)`);
    });

  tool("echo_transfer",
    "Copy files or folders between the Zima host and the Echo with adb push/pull (fast, for APKs, backups, big files).",
    { direction: z.enum(["to_echo", "from_echo"]), zima_path: z.string(), echo_path: z.string(), timeout_s: z.number().min(1).max(3600).optional() },
    async ({ direction, zima_path, echo_path, timeout_s }) => {
      await ensureRoot();
      const args = direction === "to_echo" ? ["push", zima_path, echo_path] : ["pull", echo_path, zima_path];
      return text(fmt(await adb(args, { timeout: (timeout_s || 600) * 1000 })));
    });

  tool("echo_screenshot",
    "Screenshot of what the Echo's screen shows right now (real device screen, 1280x800), returned as an image.",
    { width: z.number().int().min(160).max(1280).optional().describe("Default 960.") },
    async ({ width }) => {
      const r = await adb(["exec-out", "screencap", "-p"], { timeout: 30000 });
      if (!r.out.length) return text(fmt(r));
      const j = await run(["ffmpeg", "-loglevel", "error", "-i", "-", "-vf", `scale=${width || 960}:-1`, "-f", "image2", "-vcodec", "mjpeg", "-q:v", "4", "-"], { input: r.out, timeout: 30000 });
      if (j.out.length) return { content: [{ type: "image", data: j.out.toString("base64"), mimeType: "image/jpeg" }] };
      return { content: [{ type: "image", data: r.out.toString("base64"), mimeType: "image/png" }] };
    });

  tool("echo_logcat",
    "Read the Echo's Android logs (logcat). Filter with a regular expression; buffers main/system/crash/events/all.",
    { filter: z.string().optional().describe("Case-insensitive regex applied to each line."), lines: z.number().int().min(1).max(20000).optional().describe("Lines to scan, default 2000."), buffer: z.enum(["main", "system", "crash", "events", "radio", "all"]).optional(), max_out: z.number().int().min(1).max(5000).optional().describe("Matching lines to return, default 300 (newest).") },
    async ({ filter, lines, buffer, max_out }) => {
      const r = await adb(["logcat", "-d", "-v", "time", "-t", String(lines || 2000), "-b", buffer || "all"], { timeout: 60000 });
      let ls = r.out.toString().split("\n");
      if (filter) { const re = new RegExp(filter, "i"); ls = ls.filter((l) => re.test(l)); }
      return text(ls.slice(-(max_out || 300)).join("\n") + (r.err ? "\n[stderr] " + r.err : ""));
    });

  tool("echo_page_eval",
    "Run JavaScript inside the Echo's screen page (the VACA WebView showing /local/echo/index.html, i.e. the os-echo screen). Awaits promises; returns the value as JSON. Handy globals: window.__echoFast (load marks, errors), document.querySelector('home-assistant').hass.",
    { js: z.string().describe("Expression or async IIFE."), timeout_s: z.number().min(1).max(300).optional() },
    async ({ js, timeout_s }) => {
      const r = await cdpCall("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true }, (timeout_s || 60) * 1000);
      if (r.error) return text("CDP error: " + JSON.stringify(r.error));
      const res = r.result || {};
      if (res.exceptionDetails) return text("exception: " + JSON.stringify(res.exceptionDetails).slice(0, 4000));
      const v = res.result ? (res.result.value !== undefined ? res.result.value : res.result.description) : null;
      return text((typeof v === "string" ? v : JSON.stringify(v, null, 1)) + `\n[page ${r.page.url}]`);
    });

  tool("echo_cdp",
    "Send Chrome DevTools Protocol commands to the Echo's screen page, in one session and in order (e.g. [{method:'Performance.enable'},{method:'Performance.getMetrics'}], Page.reload, Page.navigate {url}, Page.captureScreenshot, Network.*). Give either method(+params) or commands. Screenshots come back as images.",
    { method: z.string().optional(), params: z.record(z.any()).optional(), commands: z.array(z.object({ method: z.string(), params: z.record(z.any()).optional() })).optional(), timeout_s: z.number().min(1).max(300).optional() },
    async ({ method, params, commands, timeout_s }) => {
      const cmds = commands && commands.length ? commands : method ? [{ method, params }] : null;
      if (!cmds) return text("give method or commands");
      const r = await cdpSession(cmds, (timeout_s || 60) * 1000);
      const content = [];
      r.results.forEach((x, i) => {
        const c = cmds[i];
        if (x.error) content.push({ type: "text", text: `${c.method}: CDP error ${JSON.stringify(x.error)}` });
        else if (c.method === "Page.captureScreenshot" && x.result && x.result.data) content.push({ type: "image", data: x.result.data, mimeType: `image/${(c.params && c.params.format) || "png"}` });
        else content.push({ type: "text", text: `${c.method}: ` + JSON.stringify(x.result, null, 1).slice(0, 60000) });
      });
      return { content };
    });

  tool("echo_input",
    "Touch and keys on the Echo: tap x,y; long_press x,y; swipe x,y -> x2,y2; key (Android keycode name or number, e.g. HOME, BACK, POWER, WAKEUP, VOLUME_UP, F1/F2/F3 = Echo volume/mic buttons); text (types text). Screen is 1280x800.",
    { action: z.enum(["tap", "long_press", "swipe", "key", "text"]), x: z.number().optional(), y: z.number().optional(), x2: z.number().optional(), y2: z.number().optional(), duration_ms: z.number().int().optional(), key: z.string().optional(), text: z.string().optional() },
    async (a) => {
      let cmd;
      if (a.action === "tap") cmd = `input tap ${a.x} ${a.y}`;
      else if (a.action === "long_press") cmd = `input swipe ${a.x} ${a.y} ${a.x} ${a.y} ${a.duration_ms || 800}`;
      else if (a.action === "swipe") cmd = `input swipe ${a.x} ${a.y} ${a.x2} ${a.y2} ${a.duration_ms || 300}`;
      else if (a.action === "key") cmd = `input keyevent ${/^\d+$/.test(a.key) ? a.key : "KEYCODE_" + String(a.key).replace(/^KEYCODE_/, "")}`;
      else cmd = `input text ${shq(String(a.text).replace(/ /g, "%s"))}`;
      return text(fmt(await adb(["shell", cmd], { timeout: 20000 })) || "ok");
    });

  tool("echo_volume",
    "Get or set the Echo's Android media volume (STREAM_MUSIC, 0-15). Use set 0 before any test that could make sound in the kitchen, and put the old value back after.",
    { set: z.number().int().min(0).max(15).optional() },
    async ({ set }) => {
      if (set != null) await adb(["shell", `cmd media_session volume --stream 3 --set ${set}`], { timeout: 15000 });
      const r = await adb(["shell", "dumpsys audio | grep -A6 'STREAM_MUSIC:' | grep -m1 streamVolume"], { timeout: 15000 });
      return text(r.out.toString().trim() || fmt(r));
    });

  tool("echo_status",
    "Echo overview: adb connection and root, uptime/load, memory, top processes, foreground app, screen state, media volume, IP, VACA version, screen page URL and echo-fast status.",
    {},
    async () => {
      await ensureRoot();
      const r = await adb(["shell", "sh", "-s"], { input: [
        "echo \"id: $(id -u)  build: $(getprop ro.lineage.version) $(getprop ro.build.type)\"", "uptime", "echo",
        "grep -E 'MemTotal|MemAvailable|SwapFree' /proc/meminfo", "echo",
        "top -b -n 1 -m 8 | tail -9", "echo",
        "dumpsys window | grep -m1 mCurrentFocus", "dumpsys power | grep -m1 -E 'mWakefulness='",
        "dumpsys audio | grep -A6 'STREAM_MUSIC:' | grep -m1 streamVolume",
        "ip -4 -o addr show wlan0 | awk '{print $4}'",
        "dumpsys package com.msp1974.vacompanion | grep -m1 versionName",
      ].join("\n") + "\n", timeout: 30000 });
      let page = "";
      try {
        const p = await cdpCall("Runtime.evaluate", { expression: "JSON.stringify({href:location.href,fast:window.__echoFast&&{ready:window.__echoFast.ready,marks:window.__echoFast.marks,errors:window.__echoFast.errors.slice(-5)}})", returnByValue: true }, 15000);
        page = (p.result && p.result.result && p.result.result.value) || "";
      } catch (e) { page = "page: " + e.message; }
      return text(fmt(r) + "\n\nscreen page: " + page);
    });

  await server.connect(new StdioServerTransport());
}
