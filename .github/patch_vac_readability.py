from pathlib import Path
import re

css = Path('assets/vacances-ui.css')
s = css.read_text(encoding='utf-8')
marker = '/* VACANCES_READABILITY_BALANCE_20261005 */'
block = r'''

/* VACANCES_READABILITY_BALANCE_20261005 */
:root{
  --vac-page-a:#17091f;
  --vac-page-b:#21102d;
  --vac-page-c:#2b1639;
  --vac-card-a:#261330;
  --vac-card-b:#321a40;
  --vac-line:rgba(255,255,255,.14);
  --vac-white:#ffffff;
  --vac-soft:#f3ebf7;
  --vac-muted:#e7dcef;
}
html,body,#vacTravelerMain{
  background:
    radial-gradient(70% 100% at 50% 8%,rgba(149,63,183,.22),transparent 58%),
    linear-gradient(180deg,var(--vac-page-a) 0%,var(--vac-page-b) 55%,var(--vac-page-c) 100%)!important;
  color:var(--vac-white)!important;
}
.topbar{
  background:#120719!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
}
#vacTravelerMain .hero,
#vacTravelerMain .section,
#vacTravelerMain .section.alt,
#vacTravelerMain .owner,
#vacTravelerMain .cta,
#vacTravelerMain .footer{
  background:transparent!important;
}
#vacTravelerMain h1,
#vacTravelerMain h2,
#vacTravelerMain h3,
#vacTravelerMain h4,
#vacTravelerMain p,
#vacTravelerMain li,
#vacTravelerMain label,
#vacTravelerMain small,
#vacTravelerMain span{
  color:var(--vac-white)!important;
}
#vacTravelerMain .hero p,
#vacTravelerMain .section-head p,
#vacTravelerMain .search-subtitle,
#vacTravelerMain .search-note,
#vacTravelerMain .legal,
#vacTravelerMain .vac-listing-meta,
#vacTravelerMain .vac-listing-host,
#vacTravelerMain .vac-mobile-offer small{
  color:var(--vac-soft)!important;
}
#vacTravelerMain .hero h1 span,
#vacTravelerMain .hero strong,
#vacTravelerMain .hero b,
#vacTravelerMain .accent,
#vacTravelerMain .highlight{
  color:#ff66bc!important;
}
#vacTravelerMain .kicker{
  background:#2f183b!important;
  color:#ff8acd!important;
  border:1px solid rgba(255,255,255,.12)!important;
}
#vacTravelerMain .hero-badge{
  background:#321a40!important;
  color:#fff!important;
  border:1px solid rgba(255,255,255,.16)!important;
}
#vacTravelerMain .hero-badge strong{color:#ff70bf!important}
.search-box,
#vacationSearch .vac-search-tile,
.value-card,.step,.contact-card,.price-card,.calc,
.vac-listing-card,.vac-listing-empty,.vac-mobile-offer,
.vac-date-panel,.vac-date-box{
  background:linear-gradient(180deg,var(--vac-card-a),var(--vac-card-b))!important;
  color:#fff!important;
  border-color:var(--vac-line)!important;
  box-shadow:0 12px 30px rgba(0,0,0,.20)!important;
}
.search-title,
#vacationSearch .vac-search-tile label,
#vacationSearch .vac-search-icon,
#vacationSearch .vac-search-tile .field,
#vacationSearch .vac-date-trigger,
#vacationSearch select,
#vacationSearch input,
.vac-listing-title,.vac-listing-price{
  color:#fff!important;
}
#vacationSearch .vac-search-tile .field::placeholder,
#vacationSearch input::placeholder,
#vacationSearch textarea::placeholder{
  color:#e2d4ea!important;
  opacity:1!important;
}
.vac-france-launch-note{
  background:#2b1736!important;
  color:#fff!important;
  border-color:rgba(255,255,255,.14)!important;
}
.vac-france-launch-note *{color:#fff!important}
.vac-mobile-main-return a,
.vac-mobile-top-account{
  background:#2d1738!important;
  color:#fff!important;
  border-color:rgba(255,255,255,.14)!important;
}
@media(max-width:760px){
  html,body,#vacTravelerMain{
    background:linear-gradient(180deg,#17091f 0%,#21102d 55%,#2b1639 100%)!important;
  }
}
'''
if marker in s:
    s = s.split(marker)[0].rstrip() + block
else:
    s += block
css.write_text(s, encoding='utf-8')

html = Path('vacances.html')
h = html.read_text(encoding='utf-8')
h = re.sub(r'assets/vacances-ui\.css\?v=[^"\']+', 'assets/vacances-ui.css?v=20261005-dark6', h, count=1)
html.write_text(h, encoding='utf-8')
