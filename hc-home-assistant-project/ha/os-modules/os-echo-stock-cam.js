/* os-echo-stock-cam (Nov 19 2026): the stock Echo Show camera / doorbell live view for os-echo (skin: "stock").
   Measured from Owen's own Echo (task thumbnail 7875, Ring "Front Door" live view): the picture fills the screen with no
   title bar or buttons on top of it; only small white icons along the bottom edge: a four-squares icon and the camera
   name bottom left (tap = all cameras), the microphone bottom right (tap = talk through the camera, tap again = stop).
   Only with skin: "stock"; os-echo's own camera code (live video, two-way talk) is unchanged. */
(() => {
if (window.__osStockCam) return; window.__osStockCam = true;
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CSS = `
:host(.stk-camp) .panel .ph{display:none!important;}
:host(.stk-camp) .panel{background:#000!important;}
:host(.stk-camp) .panel .cbar{display:none!important;}
.kcm{position:absolute;left:0;right:0;bottom:0;height:14vh;z-index:4;display:flex;align-items:flex-end;justify-content:space-between;padding:0 4.4vw 3.4vh 7.2vw;background:linear-gradient(0deg,rgba(0,0,0,.35),rgba(0,0,0,0));font-family:"Amazon Ember",Roboto,sans-serif;pointer-events:none;}
.kcm button{pointer-events:auto;font:inherit;color:#fff;border:0;background:none!important;padding:1.2vh .8vw!important;margin:0;display:flex;align-items:center;gap:1.6vw;font-size:3vh!important;cursor:pointer;-webkit-tap-highlight-color:transparent;text-shadow:0 1px 4px rgba(0,0,0,.6);}
.kcm ha-icon{--mdc-icon-size:3.6vh;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));}
.kcm button.on ha-icon{color:#33d17a;}
`;
const isOn = (el) => !!(el && el._c && el._c.skin === "stock" && !el._c.replay);
function overlay(el) {
  const body = el.$("pBody"); if (!body || el._panel !== "cam") return;
  if (!el.shadowRoot.querySelector("style[data-kcm]")) { const st = document.createElement("style"); st.dataset.kcm = "1"; st.textContent = CSS; el.shadowRoot.appendChild(st); }
  let o = body.querySelector(".kcm");
  if (!o) {
    o = document.createElement("div"); o.className = "kcm";
    o.innerHTML = `<button data-k="grid" aria-label="All cameras"><ha-icon icon="mdi:view-grid"></ha-icon><span></span></button><button data-k="talk" aria-label="Talk"><ha-icon icon="mdi:microphone-off"></ha-icon></button>`;
    o.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); if (el._idle) el._idle(90000);
      if (b.dataset.k === "grid") return el._open("cameras");
      if (b.dataset.k === "talk") { el._talk(!el._talking); sync(el); }
    });
    body.appendChild(o);
  }
  o.querySelector("span").textContent = (el._camCfg && el._camCfg.name) || "Camera";
  o.querySelector('[data-k="talk"]').style.display = el._camCfg && el._camCfg.talk ? "" : "none";
  sync(el);
}
function sync(el) {
  const b = el.shadowRoot.querySelector('.kcm [data-k="talk"]'); if (!b) return;
  const on = !!el._talking; b.classList.toggle("on", on); b.querySelector("ha-icon").setAttribute("icon", on ? "mdi:microphone" : "mdi:microphone-off");
}
customElements.whenDefined("os-echo").then(() => {
  const P = customElements.get("os-echo").prototype; if (P.__stkCam) return; P.__stkCam = true;
  const pc = P._pCam;
  P._pCam = function () { const r = pc.apply(this, arguments); try { if (isOn(this)) { this.classList.add("stk-camp"); overlay(this); Promise.resolve(r).then(() => overlay(this)).catch(() => {}); } } catch (e) { /* ignore */ } return r; };
  const t0 = P._tick;
  P._tick = function () { const r = t0.apply(this, arguments); try { if (isOn(this)) { this.classList.toggle("stk-camp", this._panel === "cam"); if (this._panel === "cam") sync(this); } } catch (e) { /* never break the clock */ } return r; };
  const op = P._open;
  P._open = function () { const r = op.apply(this, arguments); try { if (isOn(this)) this.classList.toggle("stk-camp", this._panel === "cam"); } catch (e) { /* ignore */ } return r; };
});
})();
