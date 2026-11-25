/* Clark Home OS - Apple design layer for both dashboards (/claude-test-dashboard and /mobile-dashboard).
   Small and global, so the individual page modules don't each need re-sending:
   1) Inter as the SF Pro stand-in on Android, as a variable font with optical sizing (true 300-700 weights)
   2) Instant press feedback: :active fires on touch-down on iOS too, and every button scales on press
   3) Keyboard focus ring in Apple's focus blue, never on touch
   4) Reduced motion: no slides, springs or bounces; colour and opacity changes stay
   5) Reduced transparency and increased contrast: frosted glass turns solid, hairlines get stronger
   The shared rules sit at zero specificity (:where), so any component's own styling still wins. */
(() => {
if (window.__osApple) return;
window.__osApple = 1;
const SCOPES = ["/claude-test-dashboard", "/mobile-dashboard"];
const inScope = () => SCOPES.some((s) => location.pathname.startsWith(s));

/* 1) typeface */
const font = () => {
if (document.getElementById("os-font-inter-v")) return;
const pre = document.createElement("link"); pre.rel = "preconnect"; pre.href = "https://fonts.gstatic.com"; pre.crossOrigin = "anonymous";
const l = document.createElement("link"); l.id = "os-font-inter-v"; l.rel = "stylesheet";
l.href = "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&display=swap";
document.head.append(pre, l);
};

/* 2-4) shared component sheet, adopted into every os-* shadow root */
const CSS = `
:host{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;font-optical-sizing:auto;}
:where(button,[role="button"],[role="switch"],[role="tab"]){-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
:where(button:not(:disabled),[role="button"]){transition:transform 220ms cubic-bezier(0.2,0.9,0.25,1);}
:where(button:not(:disabled),[role="button"]):active{transform:scale(0.97);transition-duration:90ms;}
:where(button,[role="button"],[role="switch"],[role="tab"],a,input,[tabindex]):focus{outline:none;}
:where(button,[role="button"],[role="switch"],[role="tab"],a,input,[tabindex]):focus-visible{outline:2px solid var(--os-focus,#0071e3);outline-offset:2px;}
:where(time,.num,[data-num]){font-variant-numeric:tabular-nums;}
@media (prefers-reduced-motion: reduce){
*,*::before,*::after{animation-duration:1ms !important;animation-iteration-count:1 !important;scroll-behavior:auto !important;
transition-property:opacity,color,background-color,border-color,box-shadow !important;transition-duration:180ms !important;}
:where(button,[role="button"]):active{transform:none !important;}
}`;
let sheet = null;
try { sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); } catch (e) { sheet = null; }
const adopt = (root) => {
if (!sheet || !root || root.__osa) return;
try { root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]; root.__osa = 1; } catch (e) {}
};
const ours = (el) => el && el.localName && el.localName.startsWith("os-");
/* New os-* elements: attach the sheet the moment their shadow root exists.
   adoptedStyleSheets survive the components rewriting their innerHTML. */
const orig = Element.prototype.attachShadow;
if (!orig.__osa) {
const patched = function (init) { const r = orig.call(this, init); try { if (ours(this) && inScope()) adopt(r); } catch (e) {} return r; };
patched.__osa = 1;
Element.prototype.attachShadow = patched;
}
/* os-* elements that already exist: one walk after load and after each page change */
const walk = (root, depth) => {
if (!root || depth > 30) return;
const all = root.querySelectorAll("*");
for (let i = 0; i < all.length; i++) { const el = all[i]; if (el.shadowRoot) { if (ours(el)) adopt(el.shadowRoot); walk(el.shadowRoot, depth + 1); } }
};
const sweep = () => { if (!inScope()) return; const ha = document.querySelector("home-assistant"); if (ha && ha.shadowRoot) walk(ha.shadowRoot, 0); };

/* 5) accessibility settings: a document sheet with !important beats the tokens os-glass writes inline */
const A11Y = `
@media (prefers-reduced-transparency: reduce){
home-assistant{--os-glass-filter:none !important;--os-glass-filter-strong:none !important;--os-pill-filter:none !important;
--os-glass-bg:#1c1c1e !important;--os-glass-bg-strong:#1c1c1e !important;--os-lens-bg:rgba(28,28,30,0.92) !important;}
html[data-os-mode="light"] home-assistant{--os-glass-bg:#ffffff !important;--os-glass-bg-strong:#ffffff !important;--os-lens-bg:rgba(255,255,255,0.94) !important;}
}
@media (prefers-contrast: more){
home-assistant{--os-hairline:rgba(255,255,255,0.32) !important;--os-text-2:#d1d1d6 !important;--os-text-3:#aeaeb2 !important;}
html[data-os-mode="light"] home-assistant{--os-hairline:rgba(0,0,0,0.3) !important;--os-text-2:#3a3a3c !important;--os-text-3:#48484a !important;}
}`;
const docStyle = () => {
if (document.getElementById("os-apple-a11y")) return;
const s = document.createElement("style"); s.id = "os-apple-a11y"; s.textContent = A11Y; document.head.appendChild(s);
};

/* iOS Safari only applies :active on touch-down when the page listens for touchstart */
document.addEventListener("touchstart", () => {}, { passive: true });

const apply = () => { if (!inScope()) return; font(); docStyle(); sweep(); };
const soon = () => { [60, 600, 2000].forEach((t) => setTimeout(apply, t)); };
soon();
window.addEventListener("location-changed", soon);
window.addEventListener("popstate", soon);
})();
