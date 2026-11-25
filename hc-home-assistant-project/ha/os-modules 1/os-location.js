/* Clark Home OS - mark a person's location as Unavailable when no tracker (Life360 or the HA app) has a fresh location (binary_sensor.<person>_location_live off = nothing new for 60 min) */
(() => {
const BAD = ["unknown", "unavailable", ""];
const bad = (s) => !s || BAD.includes(s.state);
const unavail = (h, pid) => {
const p = h && h.states[pid]; if (bad(p)) return true;
const lv = h.states["binary_sensor." + pid.split(".")[1] + "_location_live"]; if (lv && lv.state === "off") return true;
const ids = (p.attributes && p.attributes.device_trackers) || [];
return ids.length > 0 && ids.every((id) => bad(h.states[id]));
};
const lastSeen = (h, pid) => {
const p = h.states[pid]; const ids = [pid].concat((p && p.attributes.device_trackers) || []);
let t = 0; ids.forEach((id) => { const s = h.states[id]; if (s && !bad(s)) t = Math.max(t, Date.parse((s.attributes && s.attributes.last_seen) || s.last_updated) || 0); });
if (!t) return "No recent location";
const d = new Date(t), now = new Date(), clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const same = d.toDateString() === now.toDateString();
return "Last seen " + (same ? clock : d.toLocaleDateString("en-US", { weekday: "short" }) + " " + clock);
};
window.__osLocUnavail = unavail; window.__osLocLastSeen = lastSeen;
const pill = (el) => { if (!el) return; el.className = "p away"; el.innerHTML = '<ha-icon icon="mdi:map-marker-off-outline"></ha-icon>Unavailable'; };
customElements.whenDefined("os-family-map").then(() => {
const P = customElements.get("os-family-map").prototype; if (P.__osLoc) return; P.__osLoc = true;
const r = P._render;
P._render = function () {
const out = r.apply(this, arguments); const h = this._hass, sr = this.shadowRoot; if (!h || !sr || !this._c || !this._c.people) return out;
this._c.people.forEach((cfg) => {
if (!unavail(h, cfg.person)) return;
const row = [...sr.querySelectorAll(".row")].find((b) => b.dataset.path === (cfg.path || "")); if (!row) return;
pill(row.querySelector(".p")); const s = row.querySelector(".s"); if (s) s.textContent = lastSeen(h, cfg.person);
});
return out;
};
});
customElements.whenDefined("os-person-page").then(() => {
const P = customElements.get("os-person-page").prototype; if (P.__osLoc) return; P.__osLoc = true;
const r = P._render;
P._render = function () {
const out = r.apply(this, arguments); const h = this._hass, sr = this.shadowRoot, c = this._c; if (!h || !sr || !c || !unavail(h, c.person)) return out;
pill(sr.querySelector(".nm .p")); const w = sr.querySelector(".where"); if (w) w.textContent = "Location unavailable";
const s = sr.querySelector(".since"); if (s && s.firstChild && s.firstChild.nodeType === 3) s.firstChild.textContent = lastSeen(h, c.person); else if (s) s.prepend(document.createTextNode(lastSeen(h, c.person)));
return out;
};
});
})();
