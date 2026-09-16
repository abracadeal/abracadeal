from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = '''        <div class="ad-price">${money(a.price)}</div>
        ${(a.seller_type==='professionnel'||listingHasLoa(a))?`<div class="badge-row">
          ${a.seller_type==='professionnel'?`<span class="info-badge pro">PRO</span>`:''}
          ${listingHasLoa(a)?`<span class="info-badge loa">${listingLoaLabel(a)}</span>`:''}
        </div>`:''}
'''
new = '''        <div class="ad-price">${money(a.price)}</div>
        ${(a.seller_type==='professionnel'||listingHasLoa(a))?`<div class="badge-row">
          ${a.seller_type==='professionnel'?`<span class="info-badge pro">PRO</span>`:''}
          ${listingHasLoa(a)?`<span class="info-badge loa">LOA</span>`:''}
        </div>`:''}
'''

count = s.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one listing-card LOA block, found {count}')

s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Listing-card LOA badge shortened to LOA; detail financing remains unchanged.')
