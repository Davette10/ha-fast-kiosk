/* Clark Home OS - phone layouts for the os-* panels (applies only on screens narrower than 700px) */
(() => {
const CSS = {
"os-weather-page": `:host{height:auto!important;display:block}.page{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto!important;grid-template-areas:"now" "hourly" "daily" "radar" "stats"!important;height:auto!important;gap:12px!important}.now{padding:18px 20px!important}.now .temp{font-size:80px!important}.hourly{min-height:150px}.daily .rows{padding:0 16px!important}.day{min-height:48px;grid-template-columns:48px 36px 34px 1fr 34px!important;column-gap:8px!important}.radar{height:320px;border-radius:18px}.stats{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}.st{min-height:84px;padding:12px 14px!important}.st .v{font-size:22px!important}`,
"os-family-map": `:host{height:auto!important;display:block}.page{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:380px auto!important;height:auto!important;gap:12px!important}.mapw{grid-row:1;height:380px;border-radius:18px;overflow:hidden}.list{grid-row:2}.rows{overflow:visible!important}.seg button{height:30px!important;padding:0 11px!important;font-size:13px!important}`,
"os-person-page": `:host{height:auto!important;display:block}.page{grid-template-columns:minmax(0,1fr)!important;height:auto!important;gap:12px!important}.left{grid-template-rows:auto auto 72px!important;gap:12px!important}.tiles{grid-auto-rows:92px!important}.right{grid-template-rows:340px 210px!important;gap:12px!important}.hero{grid-template-columns:72px minmax(0,1fr)!important;padding:18px!important}.av{width:72px!important;height:72px!important}.nm{font-size:26px!important}.mapw{border-radius:18px;overflow:hidden}`,
"os-cam-panel": `:host{height:auto!important;display:block}:host .card{height:auto!important;background:none!important;border:none!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;padding:16px 18px 18px!important;border-radius:0!important}.big{font-size:24px!important}`,
"os-media-app": `:host{height:auto!important;display:block}.wrap{height:auto!important}.app{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;height:auto!important;gap:12px!important}.bar{grid-column:1!important;grid-row:1!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important;padding:16px!important}.vol{justify-content:space-between!important}.side{grid-row:2!important;display:flex!important;flex-wrap:nowrap!important;gap:8px!important;overflow-x:auto!important;overflow-y:hidden!important;padding:10px!important;align-items:center}.side .gh,.side .sh{display:none!important}.spk{width:auto!important;flex:0 0 auto!important;grid-template-columns:32px auto 14px!important;gap:8px!important;padding:6px 12px 6px 6px!important;border-radius:999px!important;background:var(--os-glass-inner,rgba(255,255,255,0.06))}.spk .ic{width:32px!important;height:32px!important;border-radius:50%!important}.main{grid-row:3!important;min-height:60vh;padding-top:14px!important}.top,.ctx,.chips{padding-left:14px!important;padding-right:14px!important}.chips{flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}.chip{flex:none!important}.scroll{padding:10px 14px 16px!important;overflow:visible!important}.grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px 10px!important}.toast{bottom:auto!important;top:12px}`,
"os-lights": `:host{height:auto!important}.card{height:auto!important}.grid{overflow:visible!important}`,
"os-glance": `:host{height:auto!important}.card{height:auto!important}.rows{gap:6px}`,
};
const put = (el) => {
const css = CSS[el.tagName.toLowerCase()]; const sr = el.shadowRoot;
if (!css || !sr || sr.getElementById("osp")) return;
const st = document.createElement("style"); st.id = "osp"; st.textContent = `@media (max-width: 700px){${css}}`; sr.appendChild(st);
};
Object.keys(CSS).forEach((tag) => {
customElements.whenDefined(tag).then(() => {
const P = customElements.get(tag).prototype; if (P.__osPhone) return; P.__osPhone = true;
["_build", "setConfig", "_render"].forEach((m) => { const f = P[m]; if (typeof f !== "function") return; P[m] = function () { const r = f.apply(this, arguments); if (r && typeof r.then === "function") r.then(() => put(this)); else put(this); return r; }; });
const cc = P.connectedCallback; P.connectedCallback = function () { if (cc) cc.apply(this, arguments); put(this); };
});
});
})();
