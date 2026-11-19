"""Browser E2E with a fake API, isolated from the production database.

Requires Python Playwright and Chrome/Chromium. Run from any directory:
  python3 scripts/experience/test-admin-e2e.py
"""
import os
from io import BytesIO
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from zipfile import ZipFile

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
TRIP = "11111111-1111-4111-8111-111111111111"
OWNER = "22222222-2222-4222-8222-222222222222"
QUOTE = "33333333-3333-4333-8333-333333333333"
DATE = "2026-11-16T12:00:00.000Z"
PRIVATE = "Costo riservato del fornitore"
PUBLIC = "Escursione privata con capitano"
SUPPLIER_CODE = "EXP-F-ABCDEF123456"
SUPPLIER = "44444444-4444-4444-8444-444444444444"
OTHER_SUPPLIER = "66666666-6666-4666-8666-666666666666"
OTHER_CODE = "EXP-F-ABCDEF654321"
SERVICE = "55555555-5555-4555-8555-555555555555"
PAYMENT_LINK = "https://buy.stripe.com/test_123456789"


def run(base):
    trip = {
        "id": TRIP, "user_id": OWNER, "title": "Viaggio demo sul Lago di Como",
        "payload": {
            "version": 1, "ids": ["activity:boat", "boat:captain", "service:pickup"], "lake": "Lago di Como",
            "details": {
                "arrival": "", "departure": "", "guests": 2, "budget": "",
                "experienceStyle": "", "arrivalPoint": "Stazione di Como San Giovanni",
                "hotel": "Hotel demo, Como centro", "stops": ["Pontile di Piazza Cavour, Como", "Villa Olmo, Como"], "notes": "",
            },
        },
        "created_at": DATE, "updated_at": DATE, "experience_quotes": [],
        "customer": {"full_name": "Cliente demo", "email": "demo@example.invalid"},
    }
    contact = {
        "id": "19", "nome": "Ospite di prova", "cognome": None, "email": "ospite@example.invalid",
        "telefono": None, "messaggio": "Richiesta di prova", "status": "new",
        "created_at": DATE, "updated_at": DATE,
    }
    suppliers = [{
        "id": SUPPLIER, "name": "Fornitore demo", "lake": "Como", "contact_name": "",
        "email": "predefinito@example.invalid", "phone": "", "website": "", "status": "confirmed", "notes": "",
        "created_at": DATE, "updated_at": DATE,
    }]
    suppliers.append({**suppliers[0], "id": OTHER_SUPPLIER, "name": "Secondo fornitore demo", "email": ""})
    recipients = {}
    services = []
    saved = None

    def mock(route):
        nonlocal saved
        request = route.request
        if not request.url.startswith(base + "/"):
            return route.abort()
        if request.url.startswith(base + "/api/admin/experience?"):
            rows = (
                [trip] if "resource=trips" in request.url
                else [contact] if "resource=requests" in request.url
                and ("status=" not in request.url or "status=" + contact["status"] in request.url)
                else suppliers if "resource=suppliers" in request.url
                else services if "resource=services" in request.url
                else []
            )
            return route.fulfill(json={"rows": rows, "total": len(rows), "page": 0})
        if request.url == base + "/api/admin/experience/partner-quote":
            data = request.post_data_json
            expected = {"supplier_id": SUPPLIER, "services": [SERVICE]}
            if "email" in data:
                assert data == {**expected, "email": "partner@example.invalid", "request_code": SUPPLIER_CODE}
                return route.fulfill(json={"ok": True, "code": SUPPLIER_CODE})
            assert data == expected
            return route.fulfill(body=b"%PDF-1.4\n%%EOF\n", headers={
                "Content-Type": "application/pdf", "X-Experience-Request-Code": SUPPLIER_CODE,
            })
        if request.url == base + f"/api/admin/experience/trips/{TRIP}/supplier-pdf":
            assert request.method == "POST"
            data = request.post_data_json
            if "requests" in data:
                assert data == {"trip_version": DATE, "requests": [
                    {"supplier_id": SUPPLIER, "services": ["boat:captain"]},
                    {"supplier_id": OTHER_SUPPLIER, "services": ["service:pickup"]},
                ]}
                buffer = BytesIO()
                with ZipFile(buffer, "w") as archive:
                    for code in (SUPPLIER_CODE, OTHER_CODE):
                        archive.writestr(f"SILKinCOM-{code}.pdf", b"%PDF-1.4\n%%EOF\n")
                return route.fulfill(body=buffer.getvalue(), headers={
                    "Content-Type": "application/zip",
                    "X-Experience-Request-Codes": ",".join([SUPPLIER_CODE, OTHER_CODE]),
                })
            if data.get("action") == "email":
                supplier_id = data["supplier_id"]
                expected = {
                    SUPPLIER: ("boat:captain", "aggiornato@example.invalid", SUPPLIER_CODE),
                    OTHER_SUPPLIER: ("service:pickup", "nuovo@example.invalid", OTHER_CODE),
                }
                service, address, code = expected[supplier_id]
                assert data == {"action": "email", "trip_version": DATE,
                    "supplier_id": supplier_id, "services": [service], "email": address}
                recipients[supplier_id] = address
                return route.fulfill(json={"ok": True, "code": code})
            assert data == {
                "trip_version": DATE,
                "services": ["boat:captain"],
                "supplier_id": SUPPLIER,
            }
            return route.fulfill(
                body=b"%PDF-1.4\n%%EOF\n",
                headers={"Content-Type": "application/pdf", "X-Experience-Request-Code": SUPPLIER_CODE},
            )
        if request.url == base + "/api/admin/experience":
            body = request.post_data_json
            if body["action"] == "request_status":
                assert body["status"] == "in_progress" and body["id"] == contact["id"]
                contact["status"] = body["status"]
                return route.fulfill(json={"ok": True, "id": int(body["id"])})
            if body["action"] == "service":
                assert body["data"]["experience_id"] == "custom"
                services.append({"id": SERVICE, **body["data"], "created_at": DATE, "updated_at": DATE})
                return route.fulfill(json={"ok": True, "id": SERVICE})
            assert body["action"] == "quote"
            q = body["data"]
            assert q["trip_id"] == TRIP and q["trip_version"] == DATE
            assert q["items"][0]["quantity"] == 2
            assert q["items"][0]["price_cents"] == 12500
            assert q["items"][0]["cost_cents"] == 7000
            assert q["items"][0]["supplier_id"] == SUPPLIER
            assert q["inclusions"] == ["Barca privata", PUBLIC]
            assert "Acconto del 50%" in q["conditions"]
            assert PAYMENT_LINK in q["conditions"]
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
        expect(page.get_by_role("heading", name="Ospite di prova")).to_be_visible()
        page.get_by_role("button", name="Leggi la richiesta").click()
        expect(page.get_by_text("Stato interno. Il cambio di stato non invia email al cliente.")).to_be_visible()
        page.get_by_label("Stato della richiesta").select_option("in_progress")
        expect(page.get_by_text("Stato della richiesta aggiornato.")).to_be_visible()
        page.get_by_label("Filtra per stato").select_option("new")
        expect(page.get_by_role("heading", name="Nessun risultato")).to_be_visible()
        page.get_by_role("button", name="Listino interno").click()
        expect(page.get_by_role("button", name="Aggiungi al listino: Navetta hotel ↔ pontile")).to_be_visible()
        page.get_by_role("button", name="Nuova voce di listino").click()
        expect(page.get_by_label("Esperienza di riferimento")).to_have_count(0)
        page.get_by_label("Nome della voce").fill("Navetta privata speciale")
        page.get_by_label("Costo a noi (€)").fill("45")
        page.get_by_label("Prezzo cliente (€)").fill("69")
        page.locator('select[name="supplier_id"]').select_option(SUPPLIER)
        page.get_by_role("button", name="Salva", exact=True).click()
        expect(page.get_by_role("heading", name="Navetta privata speciale")).to_be_visible()
        page.set_viewport_size({"width": 390, "height": 844})
        page.get_by_role("button", name="Chiedi tariffa partner").click()
        page.get_by_label("1. Scegli il fornitore").select_option(SUPPLIER)
        page.get_by_role("checkbox", name="Navetta privata speciale").check()
        page.get_by_role("button", name="3. Prepara il PDF").click()
        expect(page.get_by_text("PDF pronto.", exact=False)).to_be_visible()
        assert page.locator("html").evaluate("(el) => el.scrollWidth <= innerWidth")
        with page.expect_download() as partner_download:
            page.get_by_role("button", name="Scarica PDF", exact=True).click()
        assert partner_download.value.suggested_filename == f"SILKinCOM-{SUPPLIER_CODE}.pdf"
        page.get_by_role("button", name="Mostra anteprima PDF").click()
        expect(page.get_by_title("Anteprima PDF per il fornitore")).to_be_visible()
        expect(page.get_by_role("link", name="Apri il PDF in una nuova scheda")).to_be_visible()
        page.get_by_label("Email per Fornitore demo").fill("partner@example.invalid")
        page.get_by_role("button", name="Invia richiesta con PDF").click()
        expect(page.get_by_text("Invio accettato per", exact=False)).to_contain_text("partner@example.invalid")
        page.set_viewport_size({"width": 1440, "height": 950})
        page.get_by_role("button", name="Pratiche Experience").click()
        page.get_by_role("button", name="Viaggi e preventivi").click()
        page.get_by_role("button", name="Apri viaggio e preventivi").click()
        transfer = page.get_by_role("region", name="Trasferimento all’arrivo")
        expect(transfer).to_contain_text("Da · aeroporto o stazione")
        expect(transfer).to_contain_text("Stazione di Como San Giovanni")
        expect(transfer).to_contain_text("A · hotel o prima tappa")
        expect(transfer).to_contain_text("Hotel demo, Como centro")
        expect(page.get_by_text("Villa Olmo, Como", exact=True)).to_be_visible()
        expect(page.get_by_text("Nessuna nota del cliente", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Preventivo da preparare")).to_be_visible()
        expect(page.get_by_role("button", name="Prepara preventivo", exact=True)).to_be_visible()
        page.get_by_role("button", name="Quotazioni fornitori", exact=True).click()
        expect(page.locator("#experience-trip-suppliers")).to_have_attribute("open", "")
        download_button = page.get_by_role("button", name="Scarica PDF per fornitore")
        expect(download_button).to_be_disabled()
        expect(page.get_by_role("checkbox", name="Il lago, dalla barca")).to_have_count(0)
        page.get_by_role("checkbox", name="Il lago con capitano").check()
        page.get_by_label("Fornitore da consultare").select_option(SUPPLIER)
        with page.expect_download() as supplier_download:
            download_button.click()
        assert supplier_download.value.suggested_filename == f"SILKinCOM-{SUPPLIER_CODE}.pdf"
        expect(page.get_by_text(SUPPLIER_CODE, exact=True)).to_be_visible()
        page.get_by_text("Prepara PDF per più fornitori", exact=True).click()
        page.get_by_role("button", name="Aggiungi alla lista dei PDF").click()
        page.get_by_label("Fornitore da consultare").select_option(OTHER_SUPPLIER)
        page.get_by_role("checkbox", name="Il lago con capitano").uncheck()
        page.get_by_role("checkbox", name="Pick-up in aeroporto o in stazione").check()
        page.get_by_role("button", name="Aggiungi alla lista dei PDF").click()
        region = page.get_by_role("region", name="PDF per i fornitori")
        with page.expect_download() as zip_download:
            region.get_by_role("button", name="Scarica tutti i PDF (2)").click()
        with ZipFile(zip_download.value.path()) as archive:
            assert set(archive.namelist()) == {f"SILKinCOM-{code}.pdf" for code in (SUPPLIER_CODE, OTHER_CODE)}
        for vendor, initial, address in (
            ("Fornitore demo", "predefinito@example.invalid", "aggiornato@example.invalid"),
            ("Secondo fornitore demo", "", "nuovo@example.invalid"),
        ):
            row = region.get_by_role("listitem").filter(has=page.get_by_text(vendor, exact=True))
            row.get_by_role("button", name="Invia email", exact=True).click()
            recipient = row.get_by_role("textbox", name=f"Email per {vendor}")
            expect(recipient).to_have_value(initial)
            recipient.fill(address)
            row.get_by_role("button", name="Invia richiesta con PDF").click()
            expect(row.get_by_role("status")).to_contain_text(address)
            row.get_by_role("button", name="Chiudi", exact=True).click()
        assert len(recipients) == 2
        page.get_by_text("Richiesta al fornitore", exact=True).click()
        expect(page.get_by_role("region", name="Pacchetti scelti dal cliente")).to_contain_text("Il lago con capitano")
        services.append({**services[0], "id": "77777777-7777-4777-8777-777777777777",
                         "title": "Tour con capitano da listino", "experience_id": "boat:captain",
                         "lake": "Como", "unit": "persona", "cost_cents": 5000, "price_cents": 8000})
        services.append({**services[0], "id": "88888888-8888-4888-8888-888888888888",
                         "title": "Villa Olmo, Como", "experience_id": "custom",
                         "lake": "Como", "unit": "servizio", "cost_cents": 3000, "price_cents": 4500})
        page.get_by_role("button", name="Nuovo preventivo").click()
        expect(page.get_by_text("demo@example.invalid", exact=True)).to_be_visible()
        expect(page.locator('[aria-current="step"]')).to_have_text("Passaggio 1 di 2 · Servizi, prezzi e condizioni")
        table = page.get_by_role("table", name="Voci del preventivo")
        expect(table.get_by_role("columnheader", name="Servizio", exact=True)).to_be_visible()
        cards = page.get_by_role("region", name="Servizi nel preventivo")
        expect(cards.get_by_role("button", name="Rimuovi card Tour con capitano da listino")).to_be_visible()
        expect(table.get_by_label("Costo a noi").first).to_have_value("50")
        expect(table.get_by_label("Prezzo unitario cliente").first).to_have_value("80")
        expect(table.get_by_label("Quantità").first).to_have_value("2")
        expect(table.get_by_label("Fornitore (interno)").first).to_have_value(SUPPLIER)
        cards.get_by_role("button", name="Rimuovi card Tour con capitano da listino").click()
        cards.get_by_role("button", name="Rimuovi card Pick-up", exact=False).click()
        expect(cards.get_by_text("Pontile di Piazza Cavour, Como", exact=True)).to_be_visible()
        expect(cards.get_by_text("45,00", exact=False)).to_be_visible()
        cards.get_by_role("button", name="Rimuovi card Pontile di Piazza Cavour, Como").click()
        cards.get_by_role("button", name="Rimuovi card Villa Olmo, Como").click()
        page.get_by_text("Scegli i servizi da quotare (", exact=False).click()
        expect(page.get_by_role("checkbox", name="Navetta privata speciale", exact=False)).to_be_visible()
        page.get_by_role("button", name="Aggiungi card Navetta privata speciale", exact=True).click()
        expect(table.get_by_label("Costo a noi")).to_have_value("45")
        expect(table.get_by_label("Prezzo unitario cliente")).to_have_value("69")
        expect(table.get_by_label("Fornitore (interno)")).to_have_value(SUPPLIER)
        page.get_by_label("Categoria dei servizi da quotare").select_option("boat")
        page.get_by_role("checkbox", name="Il lago con capitano", exact=False).check()
        page.get_by_role("button", name="Aggiungi al preventivo (1)").click()
        table.get_by_role("button", name="Rimuovi voce 1").click()
        expect(table.get_by_label("Prezzo unitario cliente")).to_have_value("")
        table.get_by_label("Servizio 1").fill("Barca privata")
        table.get_by_label("Fornitore (interno)").select_option(SUPPLIER)
        table.get_by_label("Quantità").fill("2")
        table.get_by_label("Prezzo unitario cliente").fill("125")
        table.get_by_label("Costo a noi").fill("70")
        expect(table.get_by_role("status")).to_contain_text("250,00")
        expect(page.get_by_role("checkbox", name="Barca privata", exact=True)).to_be_checked()
        page.get_by_text("Inclusioni aggiuntive ed esclusioni", exact=True).click()
        page.get_by_label("Inclusioni aggiuntive").fill(PUBLIC)
        page.get_by_label("Condizioni visibili").fill("Disponibilità da confermare.")
        page.get_by_label("Link Stripe dell’acconto").fill(PAYMENT_LINK)
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
        page.get_by_role("button", name="Apri anteprima cliente").click()
        expect(page.get_by_role("heading", name="Anteprima per il cliente")).to_be_visible()
        expect(page.get_by_text("Emittente del preventivo")).to_be_visible()
        breakdown = page.get_by_role("region", name="Dettaglio dei servizi")
        expect(breakdown.get_by_text("Barca privata", exact=True)).to_be_visible()
        expect(breakdown.get_by_text("2 × 125,00", exact=False)).to_be_visible()
        expect(breakdown.get_by_text("250,00", exact=False)).to_be_visible()
        expect(breakdown.get_by_text("70,00", exact=False)).to_have_count(0)
        expect(page.locator('[aria-current="step"]')).to_have_text("Passaggio 2 di 2 · Anteprima cliente")
        expect(page.get_by_text(PUBLIC, exact=True)).to_be_visible()
        expect(page.get_by_text(PRIVATE, exact=True)).to_have_count(0)
        page.get_by_role("button", name="Pubblica nell’area cliente").click()
        expect(page.get_by_text("Preventivo pubblicato.", exact=False)).to_be_visible()

        customer.reload(wait_until="networkidle")
        expect(customer.get_by_text(PUBLIC, exact=True)).to_be_visible()
        expect(customer.get_by_text("250,00", exact=False)).to_be_visible()
        expect(customer.get_by_role("link", name="Stripe")).to_have_attribute("href", PAYMENT_LINK)
        expect(customer.get_by_role("link", name="Scarica PDF")).to_have_attribute(
            "href", f"/api/experience/quotes/{QUOTE}/pdf?locale=it"
        )
        expect(customer.get_by_text(PRIVATE, exact=True)).to_have_count(0)
        contact["experience_trip_id"] = TRIP
        page.goto(base + "/it/qa/admin", wait_until="networkidle")
        page.get_by_role("button", name="Apri preventivo della richiesta").click()
        expect(page.get_by_role("heading", name="Preventivi del viaggio")).to_be_visible()
        expect(page.get_by_text("Pubblicato nell’area cliente", exact=True)).to_be_visible()
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
    print("Experience E2E passed: individual and grouped PDFs, edited and newly entered supplier email, admin and customer quote flow.")


if __name__ == "__main__":
    main()
