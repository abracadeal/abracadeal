from pathlib import Path
import re

css = Path('assets/vacances-ui.css')
s = css.read_text()
marker = '/* VACANCES_TEXT_CONTRAST_20261005 */'
block = '''

/* VACANCES_TEXT_CONTRAST_20261005 */
:root{
  --vac-text:#fff9ff;
  --vac-soft:#e8dcef;
  --vac-muted:#cdbed7;
}
#vacTravelerMain,
#vacTravelerMain p,
#vacTravelerMain li,
#vacTravelerMain span,
#vacTravelerMain label,
#vacTravelerMain small,
#vacTravelerMain strong,
#vacTravelerMain h1,
#vacTravelerMain h2,
#vacTravelerMain h3,
#vacTravelerMain h4{
  color:var(--vac-text)!important;
}
#vacTravelerMain .hero p,
#vacTravelerMain .section-head p,
#vacTravelerMain .search-subtitle,
#vacTravelerMain .search-note,
#vacTravelerMain .vac-listing-meta,
#vacTravelerMain .vac-listing-host,
#vacTravelerMain .vac-mobile-offer small,
#vacTravelerMain .calc small,
#vacTravelerMain .vac-date-head span{
  color:var(--vac-soft)!important;
}
#vacTravelerMain .eyebrow,
#vacTravelerMain .accent,
#vacTravelerMain .highlight,
#vacTravelerMain .hero strong,
#vacTravelerMain .hero b{
  color:#f05ab1!important;
}
#vacTravelerMain .search-title,
#vacTravelerMain .section-head h2,
#vacTravelerMain .owner h2,
#vacTravelerMain .cta h2,
#vacHomeListingsSection h2{
  color:#fff!important;
  text-shadow:0 2px 12px rgba(0,0,0,.32)!important;
}
#vacationSearch .vac-search-tile label,
#vacationSearch .vac-search-icon{
  color:#f2dff6!important;
}
#vacationSearch .vac-search-tile .field,
#vacationSearch .vac-date-trigger,
#vacationSearch select,
#vacationSearch input{
  color:#fff!important;
}
#vacationSearch .vac-search-tile .field::placeholder,
#vacationSearch input::placeholder,
#vacationSearch textarea::placeholder{
  color:#cdbed7!important;
  opacity:1!important;
}
.vac-listing-title,.vac-listing-price{color:#fff!important}
.vac-listing-meta,.vac-listing-host{color:#d9cae2!important}
.vac-france-launch-note{color:#eadff0!important}
.vac-mobile-main-return span,.vac-popular-seeall{color:#f0e4f5!important}
@media(max-width:760px){
  .vac-mobile-popular h2{color:#fff!important}
  .vac-mobile-popular p{color:#e3d6e9!important}
}
'''
if marker in s:
    s = s.split(marker)[0].rstrip() + block
else:
    s += block
css.write_text(s)

html = Path('vacances.html')
h = html.read_text()
h = re.sub(r'assets/vacances-ui\.css\?v=[^"\']+', 'assets/vacances-ui.css?v=20261005-dark5', h, count=1)
html.write_text(h)
