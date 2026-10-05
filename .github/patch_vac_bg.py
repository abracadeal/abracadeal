from pathlib import Path

css = Path('assets/vacances-ui.css')
s = css.read_text()
marker = '/* VACANCES_DARK_FINAL_20261005 */'
if marker not in s:
    s += '''\n\n/* VACANCES_DARK_FINAL_20261005 */\n:root{--vac-main-dark:#1b0d2d;--vac-main-dark2:#211038;--vac-main-dark3:#2a1244}\nbody,#vacTravelerMain{background:radial-gradient(70% 110% at 50% 0%,rgba(100,39,142,.42),transparent 65%),linear-gradient(180deg,#1b0d2d 0%,#211038 68%,#2a1244 100%)!important}\n.topbar{background:rgba(27,13,45,.96)!important;border-bottom:1px solid rgba(255,255,255,.08)!important;box-shadow:0 8px 24px rgba(0,0,0,.18)!important}\n.topbar .brand,.topbar .brand small{color:#fff!important}\n@media (min-width:1024px) and (pointer:fine){.vac-desktop-actions-v2 .vac-dnav-item,.vac-desktop-actions-v2 .vac-dnav-vacances{color:#f5edf8!important}.vac-desktop-actions-v2 .vac-dnav-item:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}}\n#vacTravelerMain .section,#vacTravelerMain .section.alt,#vacTravelerMain .owner{background:transparent!important;border-color:rgba(255,255,255,.08)!important}\n#vacTravelerMain .section-head h2,#vacTravelerMain .section-head p,#vacTravelerMain .owner h2{color:#fff!important}\n@media(max-width:760px){body,#vacTravelerMain{background:linear-gradient(180deg,#1b0d2d 0%,#211038 68%,#2a1244 100%)!important}.hero{background:transparent!important}.vac-mobile-popular h2,.vac-mobile-popular p,.vac-popular-seeall,.vac-mobile-main-return span{color:#f5edf8!important}}\n'''
    css.write_text(s)

html = Path('vacances.html')
h = html.read_text()
h = h.replace('assets/vacances-ui.css?v=20261005-bg2','assets/vacances-ui.css?v=20261005-dark2')
h = h.replace('assets/vacances-ui.css?v=20261005-dark1','assets/vacances-ui.css?v=20261005-dark2')
html.write_text(h)
