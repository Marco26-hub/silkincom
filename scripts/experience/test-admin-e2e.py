"""Browser E2E with a fake API, isolated from the production database.

Requires Python Playwright and Chrome/Chromium. Run from any directory:
  python3 scripts/experience/test-admin-e2e.py
"""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
TRIP = "11111111-1111-4111-8111-111111111111"
OWNER = "22222222-2222-4222-8222-222222222222"
QUOTE = "33333333-3333-4333-8333-333333333333"
DATE = "2026-11-16T12:00:00.000Z"
PRIVATE = "Costo riservato del fornitore"
PUBLIC = "Escursione privata con capitano"


def run(base):
    trip = {
        "id": TRIP, "user_id": OWNER, "title": "Viaggio demo sul Lago di Como",
        "payload": {"version": 1, "ids": ["boat:captain"], "lake": "Lago di Como"},
        "created_at": DATE, "updated_at": DATE, "experience_quotes": [],
        "customer": {"full_name": "Cliente demo", "email": "demo@example.invalid"},
    }
    saved = None

    def mock(route):
        nonlocal saved
        request = route.request
        if not request.url.startswith(base + "/"):
            return route.abort()
        if request.url.startswith(base + "/api/admin/experience?"):
            rows = [trip] if "resource=trips" in request.url else []
            return route.fulfill(json={"rows": rows, "total": len(rows), "page": 0})
        if request.url == base + "/api/admin/experience":
            body = request.post_data_json
            assert body["action"] == "quote"
            q = body["data"]
            assert q["trip_id"] == TRIP and q["trip_version"] == DATE
            assert q["items"][0]["quantity"] == 2
            assert q["items"][0]["price_cents"] == 12500
            assert q["items"][0]["cost_cents"] == 7000
            assert q["internal_notes"] == PRIVATE
            if q["publish"]:
                assert q["id"] == QUOTE and q["quote_version"] == DATE
            saved = {
                "id": QUOTE, "trip_id": TRIP, "total_cents": 25000, "currency": "EUR",
                **{k: q[k] for k in ("inclusions", "exclusions", "conditions", "valid_until")},
                "published_at": DATE, "updated_at": DATE, "trip_updated_at": DATE,
                "status": "sent" if q["publish"] else "draft",
                "experience_quote_details": {
                    "quote_id": QUOTE, "items": q["items"], "internal_notes": PRIVATE,
                },
            }
            trip["experience_quotes"] = [saved]
            return route.fulfill(json={"ok": True, "id": QUOTE})
        if request.url == base + "/api/experience/trips":
            public_trip = {k: v for k, v in trip.items() if k not in ("user_id", "customer")}
            keys = ("id", "total_cents", "currency", "inclusions", "exclusions",
                    "conditions", "valid_until", "published_at", "trip_updated_at")
            public_trip["experience_quotes"] = (
                [{k: saved[k] for k in keys}] if saved and saved["status"] == "sent" else []
            )
            return route.fulfill(json={"trips": [public_trip]})
        return route.continue_()

    with sync_playwright() as pw:
        chrome = os.getenv("EXPERIENCE_TEST_CHROME")
        browser = pw.chromium.launch(headless=True, **(
            {"executable_path": chrome} if chrome else {"channel": "chrome"}
        ))
        context = browser.new_context(viewport={"width": 1440, "height": 950})
        context.route("**/*", mock)
        page = context.new_page()
        page.goto(base + "/it/qa/admin", wait_until="networkidle")
        page.get_by_role("button", name="Viaggi e preventivi").click()
        page.get_by_role("button", name="Apri viaggio e preventivi").click()
        page.get_by_role("button", name="Nuovo preventivo").click()
        expect(page.get_by_text("demo@example.invalid", exact=True)).to_be_visible()
        expect(page.locator('[aria-current="step"]')).to_have_text("1. Compila")
        table = page.get_by_role("table", name="Voci del preventivo")
        expect(table.get_by_role("columnheader", name="Servizio", exact=True)).to_be_visible()
        table.get_by_label("Servizio 1").fill("Barca privata")
        table.get_by_label("Quantità").fill("2")
        table.get_by_label("Prezzo unitario cliente").fill("125")
        table.get_by_label("Costo a noi").fill("70")
        expect(table.get_by_role("status")).to_contain_text("250,00")
        page.get_by_label("Servizi inclusi").fill(PUBLIC)
        page.get_by_label("Condizioni visibili").fill("Disponibilità da confermare.")
        page.get_by_label("Valido fino al").fill("2099-11-30T18:00")
        page.get_by_text("Note riservate all’admin", exact=True).click()
        page.get_by_label("Note interne riservate").fill(PRIVATE)
        page.get_by_role("button", name="Salva bozza riservata").click()
        expect(page.get_by_text("Bozza salvata.", exact=False)).to_be_visible()

        customer = context.new_page()
        customer.goto(base + "/it/qa/customer", wait_until="networkidle")
        expect(customer.get_by_text("Prezzo su preventivo.", exact=False)).to_be_visible()
        expect(customer.get_by_text(PUBLIC, exact=True)).to_have_count(0)
        expect(customer.get_by_role("link", name="Scarica PDF")).to_have_count(0)

        page.get_by_role("button", name="Apri viaggio e preventivi").click()
        expect(page.get_by_role("link", name="Scarica PDF della bozza")).to_have_attribute(
            "href", f"/api/admin/experience/quotes/{QUOTE}/pdf"
        )
        page.get_by_role("button", name="Apri e modifica bozza").click()
        page.set_viewport_size({"width": 390, "height": 844})
        expect(table.get_by_label("Prezzo unitario cliente")).to_have_value("125")
        assert page.locator("html").evaluate("(el) => el.scrollWidth <= innerWidth")
        page.get_by_role("button", name="Rivedi il preventivo").click()
        expect(page.get_by_role("heading", name="Anteprima per il cliente")).to_be_visible()
        breakdown = page.get_by_role("region", name="Dettaglio dei servizi")
        expect(breakdown.get_by_text("Barca privata", exact=True)).to_be_visible()
        expect(breakdown.get_by_text("2 × 125,00", exact=False)).to_be_visible()
        expect(breakdown.get_by_text("250,00", exact=False)).to_be_visible()
        expect(breakdown.get_by_text("70,00", exact=False)).to_have_count(0)
        expect(page.locator('[aria-current="step"]')).to_have_text("2. Rivedi e pubblica")
        expect(page.get_by_text(PUBLIC, exact=True)).to_be_visible()
        expect(page.get_by_text(PRIVATE, exact=True)).to_have_count(0)
        page.get_by_role("button", name="Pubblica nell’area cliente").click()
        expect(page.get_by_text("Preventivo pubblicato.", exact=False)).to_be_visible()

        customer.reload(wait_until="networkidle")
        expect(customer.get_by_text(PUBLIC, exact=True)).to_be_visible()
        expect(customer.get_by_text("250,00", exact=False)).to_be_visible()
        expect(customer.get_by_role("link", name="Scarica PDF")).to_have_attribute(
            "href", f"/api/experience/quotes/{QUOTE}/pdf?locale=it"
        )
        expect(customer.get_by_text(PRIVATE, exact=True)).to_have_count(0)
        browser.close()


def main():
    with tempfile.TemporaryDirectory(prefix="experience-admin-qa-") as tmp:
        project = Path(tmp)
        (project / "node_modules").symlink_to(ROOT / "node_modules")
        for name in ("package.json", "postcss.config.js", "tailwind.config.ts", "tsconfig.json"):
            shutil.copyfile(ROOT / name, project / name)
        (project / "next.config.js").write_text(
            "module.exports = require('next-intl/plugin')('./src/i18n/request.ts')({});\n"
        )
        shutil.copytree(ROOT / "src", project / "src")
        shutil.copytree(ROOT / "messages", project / "messages")
        shutil.rmtree(project / "src/app")
        (project / "src/middleware.ts").unlink(missing_ok=True)
        app = project / "src/app"
        (app / "[locale]/qa/admin").mkdir(parents=True)
        (app / "[locale]/qa/customer").mkdir(parents=True)
        (app / "layout.tsx").write_text(
            'import "./qa.css";\nimport {NextIntlClientProvider} from "next-intl";\n'
            'export default function Layout({children}: {children: React.ReactNode}) {'
            'return <html lang="it"><body><NextIntlClientProvider locale="it" messages={{}}>'
            '<main className="p-4 sm:p-8">{children}</main>'
            '</NextIntlClientProvider></body></html>;}\n'
        )
        (app / "qa.css").write_text("@tailwind base;\n@tailwind components;\n@tailwind utilities;\n")
        (app / "[locale]/qa/admin/page.tsx").write_text(
            'import {ExperienceManager} from "@/components/admin/ExperienceManager";\n'
            'export default function Page(){return <ExperienceManager/>;}\n'
        )
        (app / "[locale]/qa/customer/page.tsx").write_text(
            'import {MyTrips} from "@/components/account/MyTrips";\n'
            'import {getExperienceLocale} from "@/data/experience-localized";\n'
            'export default async function Page(){const {copy,content}=await getExperienceLocale("it");'
            'return <MyTrips copy={copy} content={content} locale="it"/>;}\n'
        )
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        base = f"http://127.0.0.1:{port}"
        with (project / "server.log").open("w+") as log:
            server = subprocess.Popen(
                [str(ROOT / "node_modules/.bin/next"), "dev", "--hostname", "127.0.0.1", "--port", str(port)],
                cwd=project, stdout=log, stderr=log,
            )
            try:
                for _ in range(45):
                    try:
                        with urllib.request.urlopen(base + "/it/qa/admin", timeout=5) as response:
                            if response.status == 200:
                                break
                    except urllib.error.HTTPError as error:
                        raise RuntimeError(f"Il server di test ha risposto {error.code}") from error
                    except OSError:
                        if server.poll() is not None:
                            raise RuntimeError("Server di test terminato")
                        time.sleep(1)
                else:
                    raise RuntimeError("Server di test non disponibile")
                run(base)
            except Exception:
                log.seek(0)
                print(log.read()[-7000:])
                raise
            finally:
                server.terminate()
                server.wait(timeout=15)
    print("Experience E2E passed: desktop table, mobile layout, draft, publish and customer privacy.")


if __name__ == "__main__":
    main()
