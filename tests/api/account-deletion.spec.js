// Eliminar la cuenta: pide la contraseña y borra todos los datos del usuario;
// en un recruiter, también sus empresas y ofertas (docs/decisions.md, entrada 042).
import { test, expect } from "@playwright/test";
import { api, TestData } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let cand, rec, otherRec, company, job, otherJob, application;

test.beforeAll(async () => {
    [cand, rec, otherRec] = await Promise.all([data.user("candidate", "del_c"), data.user("recruiter", "del_r"), data.user("recruiter", "del_r2")]);
    company = await data.company(rec);
    job = await data.job(rec, company);
    const otherCompany = await data.company(otherRec);
    otherJob = await data.job(otherRec, otherCompany);
    await api("PUT", "/users/me/cv", { token: cand.token, body: { skills: "Node.js" } });
    application = (await api("POST", "/applications", { token: cand.token, body: { job_offer_id: job.id, consent: true, signature: cand.name } })).data;
    await api("POST", "/applications", { token: cand.token, body: { job_offer_id: otherJob.id, consent: true, signature: cand.name } });
    await api("POST", "/interviews", { token: rec.token, body: { application_id: application.id, scheduled_date: "2031-05-10 10:00:00" } });
});

test.afterAll(async () => { await data.cleanup(); });

test("sin contraseña: 400; con una incorrecta: 403 (no 401, que cerraría la sesión)", async () => {
    let r = await api("DELETE", "/users/me", { token: cand.token });
    expect(r.status).toBe(400);
    r = await api("DELETE", "/users/me", { token: cand.token, body: { password: "otra123456" }, lang: "en" });
    expect(r.status).toBe(403);
    expect(r.data.message).toBe("The password is not correct");
    expect((await api("GET", "/users/me", { token: cand.token })).status, "la cuenta sigue ahí").toBe(200);
});

test("un recruiter borra su cuenta: se van sus empresas, sus ofertas y lo que recibieron", async () => {
    const r = await api("DELETE", "/users/me", { token: rec.token, body: { password: "secret123" } });
    expect(r.status).toBe(200);
    expect((await api("GET", "/users/me", { token: rec.token })).status).toBe(404);

    const jobs = (await api("GET", "/jobs", { token: cand.token })).data;
    expect(jobs.some((j) => j.id === job.id), "su oferta ya no está publicada").toBe(false);
    expect(jobs.some((j) => j.id === otherJob.id), "la de otro recruiter sigue").toBe(true);
    const companies = (await api("GET", "/companies", { token: cand.token })).data;
    expect(companies.some((c) => c.id === company.id)).toBe(false);

    const apps = (await api("GET", "/applications", { token: cand.token })).data;
    expect(apps.some((a) => a.job_offer_id === job.id), "la postulación a su oferta desaparece").toBe(false);
    expect(apps.some((a) => a.job_offer_id === otherJob.id)).toBe(true);
    expect((await api("GET", "/interviews", { token: cand.token })).data).toEqual([]);
});

test("una candidata borra su cuenta: la empresa deja de ver su postulación y su CV", async () => {
    const r = await api("DELETE", "/users/me", { token: cand.token, body: { password: "secret123" } });
    expect(r.status).toBe(200);
    expect((await api("GET", "/users/me", { token: cand.token })).status).toBe(404);
    const recView = (await api("GET", "/applications/recruiter", { token: otherRec.token })).data;
    expect(recView.some((a) => a.candidate_name === cand.name)).toBe(false);
});
