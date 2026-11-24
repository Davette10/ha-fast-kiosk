/* ha-fast-kiosk: capture the styles the HA frontend gives your card, to build a pixel-identical theme.css.
   1. Open your kiosk dashboard in the normal HA frontend (desktop Chrome is fine, same theme as the kiosk).
   2. Open DevTools > Console, set CARD to your card's tag name, paste this, press Enter.
   3. It copies a complete theme.css to the clipboard (or prints it). Save it as theme.css next to index.html. */
(() => {
  const CARD = "my-kiosk-card";
  const find = (r, s) => { const q = [r]; while (q.length) { const n = q.shift(); if (n.matches && n.matches(s)) return n; if (n.shadowRoot) q.push(n.shadowRoot); for (const c of n.children || []) q.push(c); } };
  const el = find(document, CARD); if (!el) { console.error("card not found:", CARD); return; }
  const cs = getComputedStyle(el);
  const vars = []; for (let i = 0; i < cs.length; i++) { const n = cs[i]; if (n.startsWith("--")) { const v = cs.getPropertyValue(n).trim(); if (v && !/[{};@]/.test(v)) vars.push(`${n}:${v}`); } }
  const INH = ["font-family", "font-size", "line-height", "font-weight", "color", "letter-spacing", "-webkit-font-smoothing", "user-select", "-webkit-user-select", "text-size-adjust"];
  const inh = INH.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
  const fonts = [];
  for (const s of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) { try { for (const r of s.cssRules) if (r.type === 5) fonts.push(r.cssText); } catch (e) {} }
  const bg = getComputedStyle(document.documentElement).backgroundColor;
  const css = [
    ...new Set(fonts),
    `:root{${vars.join(";")}}`,
    `html{background-color:${bg};height:100%;overflow:hidden;font-size:${getComputedStyle(document.documentElement).fontSize}}`,
    `body{margin:0;height:100%;overflow:hidden;-webkit-tap-highlight-color:transparent}`,
    `home-assistant{display:block;height:100%;${inh}}`,
    `home-assistant.stack{overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:8px;box-sizing:border-box}`,
  ].join("\n");
  (navigator.clipboard ? navigator.clipboard.writeText(css).then(() => console.log("theme.css copied:", css.length, "bytes")) : Promise.reject()).catch(() => console.log(css));
})();
