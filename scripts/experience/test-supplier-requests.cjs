// Exercise the real PDF / ZIP handler without a database or email provider.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const deps = createRequire(path.resolve(process.env.EXPERIENCE_PDF_DEPS || root, "package.json"));
const ts = deps("typescript");
const { NextRequest } = deps("next/server");
const { PDFDocument } = deps("pdf-lib");
const tripId = "11111111-1111-4111-8111-111111111111";
const operatorA = "22222222-2222-4222-8222-222222222222";
const operatorB = "33333333-3333-4333-8333-333333333333";
const version = "2026-11-19T12:00:00.000Z";
const origin = "https://www.silkincom.test";
const store = {
  updated_at: version,
  payload: {
    version: 1,
    lake: "Lago di Como",
    ids: ["activity:boat", "boat:captain", "service:pickup"],
    details: {
      arrival: "2027-05-14", departure: "2027-05-16", guests: 2, budget: "2431",
      experienceStyle: "private", arrivalPoint: "PRIVATE ADDRESS", hotel: "PRIVATE HOTEL",
      stops: ["PRIVATE STOP"], notes: "PRIVATE NAME secret@example.invalid",
    },
  },
};
const serviceId = "44444444-4444-4444-8444-444444444444";
let serviceUpdatedAt = version;
let role = "admin";
let available = [operatorA, operatorB];
let sent = [];
let audit = [];
let mailFails = false;
const mocks = {
  "@/lib/admin-api": { requireAdminApi: async () => role === "admin" ? { ok: true, userId: "test-admin" } : { ok: false, status: 401 } },
  "@/lib/rate-limit": { rateLimit: () => null },
  "@/lib/supabase/server": {
    createServiceClient: () => ({
      from(table) {
        if (table === "experience_services") {
          let ids;
          return {
            select(columns) { assert.equal(columns, "id,title,lake,unit,updated_at"); return this; },
            eq(field, value) { assert.equal(field, "active"); assert.equal(value, true); return this; },
            in(field, values) { assert.equal(field, "id"); ids = values; return this; },
            async order() {
              return { data: ids.includes(serviceId) ? [{ id: serviceId, title: "Transfer privato demo", lake: "Como", unit: "servizio", updated_at: serviceUpdatedAt }] : [], error: null };
            },
          };
        }
        return {
          select() { return this; },
          eq(field, id) { assert.equal(field, "id"); assert.equal(id, tripId); return this; },
          async maybeSingle() { assert.equal(table, "experience_trips"); return { data: store, error: null }; },
          async in(field, values) {
            assert.equal(table, "experience_suppliers");
            assert.equal(field, "id");
            return { data: values.map(id => ({ id, status: available.includes(id) ? "active" : "inactive" })), error: null };
          },
        };
      },
    }),
  },
  "@/lib/email": {
    async sendExperienceSupplierQuoteEmail(data) {
      if (mailFails) throw new Error("Simulated rejection");
      sent.push(data);
      return "mock-message";
    },
  },
  "@/lib/audit": { logAdminAction: async (...args) => audit.push(args) },
};
const modules = new Map();
function load(spec) {
  if (mocks[spec]) return mocks[spec];
  if (modules.has(spec)) return modules.get(spec);
  const file = path.join(root, "src", spec.slice(2) + ".ts");
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", result)(
    (name) => name.startsWith("@/") ? load(name) : deps(name), mod, mod.exports,
  );
  modules.set(spec, mod.exports);
  return mod.exports;
}
const { POST } = load("@/app/api/admin/experience/trips/[id]/supplier-pdf/route");
const { POST: partnerPost } = load("@/app/api/admin/experience/partner-quote/route");
function callPartner(body, requestOrigin = origin) {
  return partnerPost(new NextRequest(origin + "/api/admin/experience/partner-quote", {
    method: "POST", body: JSON.stringify(body), headers: { origin: requestOrigin },
  }));
}
const a = { supplier_id: operatorA, services: ["boat:captain"] };
const b = { supplier_id: operatorB, services: ["service:pickup"] };
const single = { trip_version: version, ...a };
const batch = { trip_version: version, requests: [a, b] };
const email = { action: "email", trip_version: version, ...a, email: "variante@example.invalid" };
function call(body, requestOrigin = origin) {
  return POST(new NextRequest(origin + "/api/admin/experience/trips/" + tripId + "/supplier-pdf", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { origin: requestOrigin },
  }), { params: Promise.resolve({ id: tripId }) });
}
async function main() {
  role = "anonymous";
  assert.equal((await call(batch)).status, 401);
  role = "admin";
  assert.equal((await call(email, "https://other.test")).status, 403);
  assert.equal((await call({ ...batch, requests: [a, a] })).status, 400);
  assert.equal((await call({ ...batch, requests: [a, { ...b, services: ["activity:golf"] }] })).status, 400);
  assert.equal((await call({ ...batch, trip_version: "2026-11-18T12:00:00.000Z" })).status, 409);
  available = [operatorA];
  assert.equal((await call(batch)).status, 400);
  available = [operatorA, operatorB];
  const response = await call(batch);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/zip");
  assert.match(response.headers.get("cache-control"), /no-store/);
  const codes = response.headers.get("x-experience-request-codes").split(",");
  assert.equal(new Set(codes).size, 2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "experience-supplier-"));
  try {
    const zipPath = path.join(dir, "suppliers.zip");
    fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
    execFileSync("unzip", ["-tq", zipPath]);
    const file = code => `SILKinCOM-${code}.pdf`;
    assert.deepEqual(execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" }).trim().split("\n"), codes.map(file));
    const contents = codes.map(code => execFileSync("unzip", ["-p", zipPath, file(code)]));
    for (let i = 0; i < codes.length; i++) {
      const bytes = contents[i];
      const pdf = await PDFDocument.load(bytes);
      assert.ok(pdf.getForm().getFields().length >= 5);
      const at = path.join(dir, file(codes[i]));
      fs.writeFileSync(at, bytes);
      const content = execFileSync("pdftotext", ["-layout", at, "-"], { encoding: "utf8" });
      assert.doesNotMatch(content, /PRIVATE|secret@example|2431|Totale del preventivo/);
      assert.match(content, i === 0 ? /Il lago con capitano/ : /Pick-up in aeroporto/);
      assert.doesNotMatch(content, i === 0 ? /Pick-up in aeroporto/ : /Il lago con capitano/);
    }
    const first = await call(single);
    assert.equal(first.headers.get("x-experience-request-code"), codes[0]);
    assert.deepEqual(Buffer.from(await first.arrayBuffer()), contents[0]);
    process.env.NODE_ENV = "development";
    assert.equal((await call(email)).status, 403);
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.RESEND_DOMAIN_VERIFIED;
    assert.equal((await call(email)).status, 503);
    process.env.RESEND_DOMAIN_VERIFIED = "true";
    process.env.RESEND_API_KEY = "SIMULATED_NOT_SENT";
    assert.equal((await call({ ...email, email: "bad address" })).status, 400);
    assert.equal(sent.length, 0);
    mailFails = true;
    assert.equal((await call(email)).status, 502);
    assert.equal(audit.length, 0);
    mailFails = false;
    const accepted = await call(email);
    assert.deepEqual(await accepted.json(), { ok: true, code: codes[0] });
    assert.equal(sent[0].recipient, email.email);
    assert.deepEqual(Buffer.from(sent[0].pdf), contents[0]);
    assert.equal(audit.length, 1);
    await call(email);
    assert.equal(sent[0].deliveryKey, sent[1].deliveryKey);
    await call({ ...email, email: "secondo@example.invalid" });
    assert.notEqual(sent[1].deliveryKey, sent[2].deliveryKey);
    const partner = { supplier_id: operatorA, services: [serviceId] };
    role = "anonymous";
    assert.equal((await callPartner(partner)).status, 401);
    role = "admin";
    assert.equal((await callPartner(partner, "https://other.test")).status, 403);
    assert.equal((await callPartner({ ...partner, services: [operatorB] })).status, 400);
    assert.equal((await callPartner({ ...partner, email: email.email })).status, 400);
    const partnerPdf = await callPartner(partner);
    assert.equal(partnerPdf.status, 200);
    const partnerCode = partnerPdf.headers.get("x-experience-request-code");
    const partnerFile = path.join(dir, "partner.pdf");
    fs.writeFileSync(partnerFile, Buffer.from(await partnerPdf.arrayBuffer()));
    const partnerText = execFileSync("pdftotext", [partnerFile, "-"], { encoding: "utf8" });
    assert.match(partnerText, /Tariffe partner riservate a SILKinCOM/);
    assert.match(partnerText, /Transfer privato\s+demo/);
    assert.doesNotMatch(partnerText, /PRIVATE|Numero di ospiti|2431/);
    const partnerEmail = { ...partner, request_code: partnerCode, email: email.email };
    assert.equal((await callPartner(partnerEmail)).status, 200);
    assert.equal(sent.at(-1).code, partnerCode);
    serviceUpdatedAt = "2026-11-20T12:00:00.000Z";
    assert.equal((await callPartner(partnerEmail)).status, 409);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log("Supplier handler passed: ZIP and PDF isolation, preview block, editable email, delivery idempotency.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
