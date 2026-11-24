import sys, json, socket, base64, os, struct, urllib.request, time
# ha-fast-kiosk benchmarking helper: talks to an Android WebView (or Chrome) over the DevTools protocol.
# Forward the WebView first:  adb forward tcp:9222 localabstract:$(adb shell cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*' | head -1)
# Usage: python3 cdpx.py 9222 eval <js-file> [out] | shot <out.png> | nav <url> | reload | metrics | perf <seconds>
port = int(sys.argv[1]); cmd = sys.argv[2]; args = sys.argv[3:]
targets = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % port))
t = [x for x in targets if x.get("type") == "page"][0]
path = t["webSocketDebuggerUrl"].split(str(port), 1)[1]
s = socket.create_connection(("127.0.0.1", port), timeout=60)
key = base64.b64encode(os.urandom(16)).decode()
s.send(("GET %s HTTP/1.1\r\nHost: 127.0.0.1:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, port, key)).encode())
resp = b""
while b"\r\n\r\n" not in resp: resp += s.recv(1)
def send(obj):
    data = json.dumps(obj).encode(); mask = os.urandom(4); hdr = bytearray([0x81]); n = len(data)
    if n < 126: hdr.append(0x80 | n)
    elif n < 65536: hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
    else: hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
    s.send(bytes(hdr) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
def recvall(n):
    b = b""
    while len(b) < n:
        c = s.recv(n - len(b))
        if not c: raise SystemExit("closed")
        b += c
    return b
def recv():
    h = recvall(2); n = h[1] & 0x7f
    if n == 126: n = struct.unpack(">H", recvall(2))[0]
    elif n == 127: n = struct.unpack(">Q", recvall(8))[0]
    return json.loads(recvall(n))
mid = [0]
def call(method, params=None):
    mid[0] += 1; i = mid[0]
    send({"id": i, "method": method, "params": params or {}})
    while True:
        m = recv()
        if m.get("id") == i: return m
def out(text, dest=None):
    if dest: open(dest, "w").write(text); print("wrote", dest, len(text))
    else: print(text)
if cmd == "eval":
    r = call("Runtime.evaluate", {"expression": open(args[0]).read(), "awaitPromise": True, "returnByValue": True})
    res = r.get("result", {})
    v = res.get("result", {}).get("value") if "exceptionDetails" not in res else {"exception": res["exceptionDetails"]}
    out(v if isinstance(v, str) else json.dumps(v), args[1] if len(args) > 1 else None)
elif cmd == "shot":
    r = call("Page.captureScreenshot", {"format": "png"})
    open(args[0], "wb").write(base64.b64decode(r["result"]["data"])); print("wrote", args[0])
elif cmd == "nav":
    print(json.dumps(call("Page.navigate", {"url": args[0]}).get("result")))
elif cmd == "reload":
    print(json.dumps(call("Page.reload", {"ignoreCache": False}).get("result")))
elif cmd == "metrics":
    call("Performance.enable")
    m = {x["name"]: x["value"] for x in call("Performance.getMetrics")["result"]["metrics"]}
    print(json.dumps(m))
elif cmd == "perf":
    call("Performance.enable"); g = lambda: {x["name"]: x["value"] for x in call("Performance.getMetrics")["result"]["metrics"]}
    a = g(); time.sleep(float(args[0])); b = g(); dt = b["Timestamp"] - a["Timestamp"]
    r = {k: round((b[k] - a[k]) / dt * 100, 2) for k in ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"]}
    r.update(heapMB=round(b["JSHeapUsedSize"] / 1e6, 1), nodes=b["Nodes"], listeners=b["JSEventListeners"]); print(json.dumps(r))
