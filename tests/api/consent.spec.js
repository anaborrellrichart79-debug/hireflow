// Retirar o volver a dar el consentimiento de una postulación
// (PUT /applications/:id/consent, docs/decisions.md, entrada 034).
import { test, expect } from "@playwright/test";
import { api, TestData } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let c1, c2, r1, app, personal, firstConsentAt;

const recruiterView = async () => (await api("GET", "/applications/recruiter", { token: r1.token })).data.find((a) => a.id === app.id);
const setConsent = (body, token = c1.token, id = app.id) => api("PUT", `/applications/${id}/consent`, { token, body });
// consent_at tiene precisión de segundos: se espera para poder ver si cambia
const nextSecond = () => new Promise((r) => setTimeout(r, 1100));

test.beforeAll(async () => {
    [c1, c2, r1] = await Promise.all([data.user("candidate", "cs_c1"), data.user("candidate", "cs_c2"), data.user("recruiter", "cs_r1")]);
    const company = await data.company(r1);
    const job = await data.job(r1, company);
    await api("PUT", "/users/me/cv", { token: c1.token, body: { skills: "Node.js, SQL" } });
    app = (await api("POST", "/applications", { token: c1.token, body: { job_offer_id: job.id, consent: true, consent_cv: true, signature: "PW cs_c1" } })).data;
    personal = (await api("POST", "/applications", { token: c1.token, body: { notes: "seguimiento externo", consent: true, signature: "PW cs_c1" } })).data;
    firstConsentAt = (await api("GET", `/applications/${app.id}`, { token: c1.token })).data.consent_at;
});

test.afterAll(async () => { await data.cleanup(); });

test("antes de nada, la empresa ve contacto y CV", async () => {
    const v = await recruiterView();
    expect(v.candidate_email).toBe(c1.email);
    expect(v.cv_skills).toBe("Node.js, SQL");
});

test("validaciones y permisos", async () => {
    expect((await setConsent({})).status, "sin campos").toBe(400);
    expect((await setConsent({ consent_contact: "false" })).status, "\"false\" como texto").toBe(400);
    expect((await setConsent({ consent_contact: false }, c2.token)).status, "otro candidato").toBe(404);
    expect((await setConsent({ consent_contact: false }, r1.token)).status, "recruiter").toBe(403);
    expect((await api("PUT", `/applications/${app.id}/consent`, { body: { consent_contact: false } })).status, "sin token").toBe(401);
    expect((await setConsent({ consent_contact: false }, c1.token, personal.id)).status, "seguimiento personal").toBe(404);
    const v = await recruiterView();
    expect(v.candidate_email && v.cv_skills, "los intentos rechazados no cambian nada").toBeTruthy();
});

test("retirar el CV: la empresa deja de verlo al momento, el contacto sigue", async () => {
    const r = await setConsent({ consent_cv: false });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ consent_share_cv: 0, consent_share_contact: 1 });
    expect(r.data.consent_updated_at).toBeTruthy();
    const v = await recruiterView();
    expect(v.cv_skills).toBeNull();
    expect(v.candidate_email).toBe(c1.email);
});

test("retirar el contacto: consent_at se conserva y la postulación sigue viva", async () => {
    await nextSecond();
    const r = await setConsent({ consent_contact: false });
    expect(r.data.consent_share_contact).toBe(0);
    expect(String(r.data.consent_at)).toBe(String(firstConsentAt));
    const v = await recruiterView();
    expect(v).toMatchObject({ candidate_email: null, candidate_phone: null, candidate_name: c1.name, status: "applied" });
});

test("volver a darlos: consent_at se renueva; reenviar el mismo valor no", async () => {
    await nextSecond();
    const r = await setConsent({ consent_contact: true, consent_cv: true });
    expect(r.data).toMatchObject({ consent_share_contact: 1, consent_share_cv: 1 });
    expect(String(r.data.consent_at)).not.toBe(String(firstConsentAt));
    const v = await recruiterView();
    expect(v.candidate_email).toBe(c1.email);
    expect(v.cv_skills).toBe("Node.js, SQL");

    await nextSecond();
    const again = await setConsent({ consent_contact: true });
    expect(String(again.data.consent_at)).toBe(String(r.data.consent_at));
});

test("el resto de la postulación no cambia", async () => {
    const after = (await api("GET", `/applications/${app.id}`, { token: c1.token })).data;
    expect(after).toMatchObject({ status: "applied", signature_name: "PW cs_c1" });
});
