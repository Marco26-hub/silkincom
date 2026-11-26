"""Read-only browser QA. All outgoing non-GET requests are blocked."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('docs/aeo-2026-11-26/preview')
OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, passed):
    results.append({'name': name, 'status': 'pass' if passed else 'fail'})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    def guard(route):
        request = route.request
        if request.method not in ['GET', 'HEAD'] or any(x in request.url for x in ['googletagmanager', 'google-analytics', 'facebook.net', '/api/analytics/']):
            route.abort()
        else:
            route.continue_()
    context.route('**/*', guard)
    context.add_init_script("localStorage.setItem('silkincom-cookie-consent','reject'); localStorage.setItem('silk_welcome_v1','dismissed');")
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://localhost:3010/', wait_until='networkidle', timeout=90000)
    assert page.get_by_role('dialog').count() == 0, 'Unexpected popup obscures the preview'
    home_definition = page.locator('[data-brand-definition]')
    home_definition.scroll_into_view_if_needed()
    page.wait_for_function("() => { let node = document.querySelector('[data-brand-definition]'); while (node) { if (Number(getComputedStyle(node).opacity) < 0.99) return false; node = node.parentElement; } return true; }")
    check('Identity integrated in the existing Maison copy', home_definition.is_visible())
    page.screenshot(path=str(OUT / 'home-desktop.png'))
    for name, path in [('faq', '/faq'), ('press', '/press'), ('materiali', '/materiali')]:
        page.goto('http://localhost:3010' + path, wait_until='networkidle', timeout=90000)
        if name == 'faq':
            page.get_by_role('heading', name='I prodotti sono davvero Made in Italy?', exact=True).scroll_into_view_if_needed()
            check('FAQ correct Como twilly dimensions', '120 × 7,5 cm' in page.locator('main').inner_text())
        else:
            page.locator('#origine-e-filiera').scroll_into_view_if_needed()
            check(name + ' confirmed Como production visible', page.locator('#origine-e-filiera').is_visible())
        page.screenshot(path=str(OUT / (name + '-desktop.png')))
    page.goto('http://localhost:3010/prodotto/brunate-maglione-lana-panna?size=M', wait_until='networkidle', timeout=90000)
    size_button = page.get_by_role('button', name='Taglia M', exact=True)
    check('ProductGroup URL preselects M', size_button.get_attribute('aria-pressed') == 'true')
    size_button.scroll_into_view_if_needed()
    page.screenshot(path=str(OUT / 'product-size-desktop.png'))
    page.goto('http://localhost:3010/en/faq', wait_until='networkidle', timeout=90000)
    check('English FAQ shipping link stays in English', page.locator('main a[href="/en/spedizioni"]').count() > 0)
    check('English FAQ has no Italian shipping link', page.locator('main a[href="/spedizioni"]').count() == 0)
    page.set_viewport_size({'width': 390, 'height': 844})
    for name, path in [('home', '/'), ('faq', '/faq'), ('journal', '/trame-di-como/come-annodare-un-twilly')]:
        page.goto('http://localhost:3010' + path, wait_until='networkidle', timeout=90000)
        if name == 'home':
            page.locator('[data-brand-definition]').scroll_into_view_if_needed()
            page.wait_for_function("() => { let node = document.querySelector('[data-brand-definition]'); while (node) { if (Number(getComputedStyle(node).opacity) < 0.99) return false; node = node.parentElement; } return true; }")
        check(name + ' mobile has no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        if name == 'journal':
            page.locator('article').scroll_into_view_if_needed()
            check('Journal shows semantic body headings', page.locator('article h2').count() > 0)
            check('Journal has no visible HTML tags', '<p>' not in page.locator('article').inner_text())
        page.screenshot(path=str(OUT / (name + '-mobile.png')))
    check('No uncaught browser errors', not errors)
    browser.close()

report = {'checks': results, 'errors': errors, 'limits': 'No form, analytics, cart, payment or external message was sent.'}
(OUT / 'browser-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(1 if any(c['status'] == 'fail' for c in results) else 0)
