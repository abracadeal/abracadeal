from pathlib import Path
import re

css = Path('assets/vacances-ui.css')
s = css.read_text(encoding='utf-8')
marker = '/* VACANCES_BANNER_CENTER_20261005 */'
block = r'''

/* VACANCES_BANNER_CENTER_20261005 */
.vac-mobile-banner-shell{
  width:min(1010px,calc(100% - 40px))!important;
  margin:22px auto 34px!important;
  display:block!important;
  text-align:center!important;
}
.vac-mobile-banner-exact{
  display:block!important;
  width:100%!important;
  height:auto!important;
  margin:0 auto!important;
  object-fit:contain!important;
  object-position:center center!important;
  border-radius:24px!important;
}
@media(max-width:760px){
  .vac-mobile-banner-shell{
    width:calc(100% - 20px)!important;
    margin:10px auto 14px!important;
  }
  .vac-mobile-banner-exact{
    width:100%!important;
    margin:0 auto!important;
    object-position:center center!important;
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
h = re.sub(r'assets/vacances-ui\.css\?v=[^"\']+', 'assets/vacances-ui.css?v=20261005-dark7', h, count=1)
html.write_text(h, encoding='utf-8')
