from pathlib import Path
import re

css_path = Path('assets/vacances-ui.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* VACANCES_CARDS_ACCENT_20261005 */'
block = r'''

/* VACANCES_CARDS_ACCENT_20261005 */
#vacTravelerMain .value-card p,
#vacTravelerMain .value-card small,
#vacTravelerMain .value-card .muted{
  color:#efb6ea!important;
}
#vacTravelerMain .value-card .icon{
  background:linear-gradient(135deg,rgba(217,106,208,.20),rgba(179,79,196,.16))!important;
  color:#e47bdc!important;
  border:1px solid rgba(217,106,208,.34)!important;
  box-shadow:0 6px 16px rgba(188,71,178,.10)!important;
}
#vacTravelerMain .value-card{
  border-color:rgba(217,106,208,.26)!important;
}
#vacTravelerMain .value-card .mini-link{
  color:#e47bdc!important;
}
'''
if marker in css:
    css = css.split(marker)[0].rstrip() + block
else:
    css += block
css_path.write_text(css, encoding='utf-8')

html_path = Path('vacances.html')
html = html_path.read_text(encoding='utf-8')
html = re.sub(r'assets/vacances-ui\.css\?v=[^"\']+', 'assets/vacances-ui.css?v=20261005-dark7', html, count=1)
html_path.write_text(html, encoding='utf-8')
