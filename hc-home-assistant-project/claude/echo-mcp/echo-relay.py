#!/usr/bin/env python3
"""echo-relay (Nov 24 2026, Claude): keeps Claude's "echo" connector (the kitchen Echo Show) alive on Owen's Mac.

Claude desktop starts this instead of ssh. It speaks MCP over stdio to Claude and forwards everything to the echo
server on the Zima over SSH. When the SSH link dies (Mac sleep, Wi-Fi change, Tailscale hiccup), Claude never sees
the server stop: the next call reconnects, replays the MCP handshake, and carries on. A call that was running when
the link dropped gets an error (it is not re-sent, because it may already have changed something).
Python standard library only. Log: stderr (Claude's mcp-server-echo.log).
"""
import json, os, subprocess, sys, threading, time

HOST = os.environ.get("ECHO_HOST", "Harper@100.x.x.x")
SSH = ["/usr/bin/ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new",
       "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", HOST,
       "/DATA/AppData/claude-desktop/config/.local/node/bin/node",
       "/DATA/AppData/claude-desktop/config/.local/echo/server.mjs"]
if os.environ.get("ECHO_RELAY_CMD"):  # for testing
    SSH = json.loads(os.environ["ECHO_RELAY_CMD"])
RELAY_ID = "__echo_relay_init__"

out_lock = threading.Lock()
state = threading.RLock()
child = None          # current ssh process
gen = 0               # bumps on every (re)connect
init_line = None      # Claude's initialize request (replayed on reconnect)
initialized_line = None
inflight = {}         # json(id) -> method, for requests sent to the current child


def log(*a):
    print(time.strftime("%H:%M:%S"), "[echo-relay]", *a, file=sys.stderr, flush=True)


def send_out(obj):
    line = obj if isinstance(obj, str) else json.dumps(obj)
    with out_lock:
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


def error_reply(id_, text):
    send_out({"jsonrpc": "2.0", "id": id_, "error": {"code": -32603, "message": text}})


def reader(p, g):
    global child
    for raw in p.stdout:
        line = raw.decode("utf-8", "replace").strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            continue
        if isinstance(msg, dict) and msg.get("id") == RELAY_ID:
            continue
        if isinstance(msg, dict) and "id" in msg and ("result" in msg or "error" in msg):
            with state:
                inflight.pop(json.dumps(msg["id"]), None)
        send_out(line)
    with state:
        if g != gen:
            return
        lost = list(inflight.keys())
        inflight.clear()
        child = None
    log("link to the Zima closed (exit %s); %d call(s) were running" % (p.poll(), len(lost)))
    for k in lost:
        error_reply(json.loads(k), "The connection to the Zima dropped while this ran (sleep or network). "
                    "It reconnects on the next call. Check the Echo's state before re-running anything that changes it.")


def spawn(handshake):
    """Start ssh; with handshake=True replay initialize/initialized so the new server is ready. Returns process or None."""
    global child, gen
    p = subprocess.Popen(SSH, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr)
    if handshake and init_line:
        try:
            m = json.loads(init_line)
            m["id"] = RELAY_ID
            p.stdin.write((json.dumps(m) + "\n").encode())
            p.stdin.flush()
            deadline = time.time() + 30
            ok = False
            while time.time() < deadline:
                raw = p.stdout.readline()
                if not raw:
                    break
                try:
                    r = json.loads(raw)
                except ValueError:
                    continue
                if isinstance(r, dict) and r.get("id") == RELAY_ID:
                    ok = "result" in r
                    break
            if not ok:
                raise RuntimeError("no initialize reply")
            if initialized_line:
                p.stdin.write((initialized_line + "\n").encode())
                p.stdin.flush()
        except Exception as e:  # noqa: BLE001
            log("reconnect failed:", e)
            try:
                p.kill()
            except Exception:  # noqa: BLE001
                pass
            return None
    with state:
        gen += 1
        child = p
        g = gen
    threading.Thread(target=reader, args=(p, g), daemon=True).start()
    return p


def ensure(handshake=True):
    with state:
        p = child
    if p is not None and p.poll() is None:
        return p
    for delay in (0, 2, 4, 8):  # about 15 s of retries, then give up for this call
        if delay:
            time.sleep(delay)
        log("connecting to the Zima" + (" (retry)" if delay else ""))
        p = spawn(handshake)
        if p:
            return p
    return None


def main():
    global init_line, initialized_line, child
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            msg = None
        method = msg.get("method") if isinstance(msg, dict) else None
        is_request = isinstance(msg, dict) and "id" in msg and method is not None
        if method == "initialize":
            init_line = line
            with state:
                old = child
                child = None
            if old and old.poll() is None:
                old.kill()
            p = ensure(handshake=False)
        elif method == "notifications/initialized":
            initialized_line = line
            p = ensure()
        else:
            with state:
                p = child if child is not None and child.poll() is None else None
            if p is None and is_request:
                p = ensure()
            if p is None:
                if is_request:
                    error_reply(msg["id"], "Can't reach the Zima (100.x.x.x) right now. Check that the Mac is online and Tailscale is connected.")
                continue
        if p is None:
            if is_request:
                error_reply(msg["id"], "Can't reach the Zima right now.")
            continue
        if is_request:
            with state:
                inflight[json.dumps(msg["id"])] = method
        try:
            p.stdin.write((line + "\n").encode())
            p.stdin.flush()
        except (BrokenPipeError, OSError):
            with state:
                inflight.pop(json.dumps(msg["id"]), None) if is_request else None
            if is_request:
                error_reply(msg["id"], "The connection to the Zima dropped. Try again; it reconnects automatically.")
    with state:
        p = child
    if p and p.poll() is None:
        p.kill()


if __name__ == "__main__":
    main()
