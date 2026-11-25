/* os-echo-stock-set (Nov 19 2026): makes os-alexa-skin's Settings look like the stock Echo Show 8 Settings.
   Measured from Owen's own Echo (task thumbnail 7882, Settings > Device Options > About This Device): dark left list
   (Settings title, white line icons, 3.25vh labels, full-height square highlight on the open item, order Alexa,
   Display & Appearance, Accounts & Profiles, Device Options, Notifications & Sound, Accessibility); navy pane with a
   soft blue glow; round back button and centred title; rows inside one rounded translucent card, title + grey second line.
   Adds the Accounts & Profiles page (the people in this home from Home Assistant). Only with skin: "stock". */
(() => {
if (window.__osStockSet) return; window.__osStockSet = true;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = `
.sk-set{background:radial-gradient(60% 70% at 72% 100%,#1f5d95 0%,#143a63 32%,#0e2238 62%,#0b1626 100%)!important;font-family:"Amazon Ember",Roboto,sans-serif!important;}
.sk-nav{width:32.5vw!important;padding:0!important;background:#0c1118;overflow-y:auto;touch-action:pan-y;scrollbar-width:none;}
.sk-nav::-webkit-scrollbar{display:none;}
.sk-nav h1{margin:0!important;height:16.9vh;padding:0 0 0 4.06vw;display:flex!important;align-items:center;font-size:4vh!important;font-weight:400!important;flex:none;}
.sk-nav h1 button{display:none!important;}
.sk-nav .it{order:9;flex:none;height:13.3vh;padding:0 0 0 4.4vw!important;border-radius:0!important;font-size:3.25vh!important;gap:2.4vw!important;line-height:1.25;}
.sk-nav .it ha-icon{--mdc-icon-size:4.6vh!important;flex:none;}
.sk-nav .it.cur{background:rgba(255,255,255,.08)!important;}
.sk-nav .it[data-c=alexa]{order:1;}.sk-nav .it[data-c=display]{order:2;}.sk-nav .it[data-c=accounts]{order:3;}.sk-nav .it[data-c=device]{order:4;}.sk-nav .it[data-c=sound]{order:5;}.sk-nav .it[data-c=access]{order:6;}.sk-nav .it[data-c=help]{order:7;}
.sk-pane{background:none!important;margin:0!important;border-radius:0!important;}
.sk-ph{height:18.5vh;padding:0 7vw!important;font-size:4vh!important;font-weight:400!important;flex:none;}
.sk-ph .skb{position:absolute;left:6.4vw;top:50%;width:8vh;height:8vh;margin-top:-4vh;border-radius:50%;background:rgba(255,255,255,.12)!important;display:flex;align-items:center;justify-content:center;}
.sk-ph .skb ha-icon{--mdc-icon-size:4.4vh;}
.sk-body{padding:0 4.2vw 4vh!important;}
.sk-grp{margin:0 0 3vh!important;}
.sk-grp:first-child{margin-top:-1.25vh!important;}
.sk-grp h4{margin:0 0 1.2vh 1vw!important;font-size:2.6vh!important;font-weight:400!important;letter-spacing:0!important;text-transform:none!important;color:#aab4bf!important;}
.sk-grp > .sk-row,.sk-grp > .sk-sl,.sk-grp > .sk-note,.sk-grp > .sk-opts{background:rgba(255,255,255,.075);padding-left:4.06vw!important;padding-right:4.2vw!important;border-bottom:0!important;position:relative;}
.sk-grp > :first-child:not(h4),.sk-grp > h4 + *{border-radius:3vh 3vh 0 0;}
.sk-grp > :last-child{border-radius:0 0 3vh 3vh;}
.sk-grp > :only-child,.sk-grp > h4 + :last-child{border-radius:3vh!important;}
.sk-grp > * + .sk-row::before,.sk-grp > * + .sk-sl::before,.sk-grp > * + .sk-opts::before{content:"";position:absolute;left:4.06vw;right:4.2vw;top:0;height:1px;background:rgba(255,255,255,.22);}
.sk-grp > h4 + *::before{display:none;}
.sk-row{min-height:14.5vh;padding-top:2.2vh!important;padding-bottom:2.2vh!important;}
.sk-row .tx b{font-size:3.75vh!important;font-weight:400!important;line-height:1.25;}
.sk-row .tx span{font-size:3vh!important;font-weight:400!important;color:#b4bdc7!important;margin-top:.3vh!important;}
.sk-row .val{font-size:3vh!important;color:#b4bdc7!important;}
.sk-row.dis .tx b,.sk-row.dis .tx span{color:rgba(255,255,255,.4)!important;}
.sk-row > ha-icon{--mdc-icon-size:4.4vh;color:#fff;}
.sk-note{font-size:3vh!important;color:#b4bdc7!important;padding-top:2.2vh!important;padding-bottom:2.2vh!important;}
.sk-sl{padding-top:2.4vh!important;padding-bottom:2.4vh!important;}
.sk-tg{width:9vh!important;height:4.8vh!important;}
.sk-tg::after{width:3.8vh!important;height:3.8vh!important;}
.sk-tg.on::after{transform:translateX(4.2vh)!important;}
`;
const isOn = (el) => !!(el && el._c && el._c.skin === "stock" && !el._c.replay);
const row = (title, sub, right, dis) => `<div class="sk-row${dis ? " dis" : ""}"><div class="tx"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>${right || ""}</div>`;
function accounts(el) {
  const h = el._hass, people = Object.keys(h.states).filter((id) => id.startsWith("person.")).map((id) => h.states[id]);
  const first = (p) => String(p.attributes.friendly_name || p.entity_id.split(".")[1]).split(" ")[0];
  return `<div class="sk-grp">${row("Household", `${people.length} ${people.length === 1 ? "person" : "people"} in this home`, "") +
    people.map((p) => row(first(p), p.state === "home" ? "Home" : p.state === "not_home" ? "Away" : String(p.state).replace(/_/g, " "), "")).join("")}</div>` +
    `<div class="sk-grp"><h4>Profiles</h4>${row("Recognized Voices", "Alexa answers everyone in the home the same way.", "", true) + row("Amazon Account", "This Echo uses Home Assistant instead of an Amazon account.", "", true)}</div>`;
}
function setup(el) {
  const sr = el.shadowRoot, s = sr.querySelector(".sk-set"); if (!s || s.__ks) return; s.__ks = true;
  const st = document.createElement("style"); st.textContent = CSS; sr.appendChild(st);
  const nav = s.querySelector(".sk-nav");
  if (nav && !nav.querySelector('[data-c="accounts"]')) { const b = document.createElement("button"); b.className = "it"; b.dataset.c = "accounts"; b.innerHTML = `<ha-icon icon="mdi:account-multiple"></ha-icon>Accounts &amp; Profiles`; nav.appendChild(b); }
  const icons = { alexa: "mdi:account-voice", display: "mdi:image-outline", device: "mdi:tune-vertical-variant", sound: "mdi:bell-outline", access: "mdi:human", help: "mdi:help-circle-outline" };
  s.querySelectorAll(".sk-nav .it").forEach((b) => { const i = icons[b.dataset.c], ic = b.querySelector("ha-icon"); if (i && ic) ic.setAttribute("icon", i); if (b.dataset.c === "display") b.innerHTML = `<ha-icon icon="${i}"></ha-icon><span>Display &amp;<br>Appearance</span>`; if (b.dataset.c === "sound") b.innerHTML = `<ha-icon icon="${icons.sound}"></ha-icon><span>Notifications &amp;<br>Sound</span>`; });
  /* the skin draws the pane on every state change; the Accounts page and the round back button are put back after it */
  const fix = () => {
    const ph = s.querySelector(".sk-ph"); if (!ph) return;
    if (!ph.querySelector(".skb")) { const b = document.createElement("button"); b.className = "skb"; b.dataset.close = "1"; b.setAttribute("aria-label", "Back"); b.innerHTML = `<ha-icon icon="mdi:chevron-left"></ha-icon>`; ph.prepend(b); }
    if (el.__skCat === "accounts") {
      if (!ph.textContent.includes("Accounts")) ph.append("Accounts & Profiles");
      const body = s.querySelector(".sk-body"), html = accounts(el); if (body.__ka !== html || !body.innerHTML) { body.innerHTML = html; body.__ka = html; }
    }
  };
  new MutationObserver(() => { if (el.__skOpen) fix(); }).observe(s, { childList: true, subtree: true, characterData: true });
  s.addEventListener("click", () => setTimeout(fix, 0));
  fix();
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkSet) return; P.__stkSet = true;
  const t0 = P._tick;
  P._tick = function () {
    const r = t0.apply(this, arguments);
    try {
      if (isOn(this) && this.shadowRoot && !this.__ksObs) {
        /* style Settings the moment the skin creates it, so the old look never flashes */
        this.__ksObs = new MutationObserver(() => { if (this.shadowRoot.querySelector(".sk-set")) setup(this); });
        this.__ksObs.observe(this.shadowRoot, { childList: true });
      }
      if (isOn(this) && this.__skOpen) setup(this);
    } catch (e) { /* never break the clock */ }
    return r;
  };
});
})();
