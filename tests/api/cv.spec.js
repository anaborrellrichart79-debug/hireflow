// CV del candidato: CRUD /users/me/cv, uso en job-match y /ai/ask, y
// visibilidad para la empresa con consentimiento (docs/decisions.md, entrada 033).
import { test, expect } from "@playwright/test";
import { api, TestData } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let c1, c2, r1, r2, job;

test.beforeAll(async () => {
    [c1, c2, r1, r2] = await Promise.all([
        data.user("candidate", "cv_c1"), data.user("candidate", "cv_c2"),
        data.user("recruiter", "cv_r1"), data.user("recruiter", "cv_r2")
    ]);
    const company = await data.company(r1);
    job = await data.job(r1, company, { skills_required: "Node.js, MySQL, Kubernetes" });
});

test.afterAll(async () => { await data.cleanup(); });

test("sin CV: 200 con los campos a null (no es un error)", async () => {
    const r = await api("GET", "/users/me/cv", { token: c1.token });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ id: null, skills: null, about: null });
});

test("permisos: solo candidate, y con sesión", async () => {
    expect((await api("GET", "/users/me/cv", { token: r1.token })).status).toBe(403);
    expect((await api("PUT", "/users/me/cv", { token: r1.token, body: { skills: "x" } })).status).toBe(403);
    expect((await api("GET", "/users/me/cv")).status).toBe(401);
});

test("validaciones", async () => {
    const cases = [
        [{}, "sin campos"],
        [{ resume_url: "javascript:alert(1)" }, "URL javascript:"],
        [{ skills: "x".repeat(2001) }, "skills demasiado largo"],
        [{ skills: 123 }, "skills numérico"]
    ];
    for (const [body, label] of cases) {
        expect((await api("PUT", "/users/me/cv", { token: c1.token, body })).status, label).toBe(400);
    }
});

test("PUT crea, actualiza solo lo enviado y null vacía un campo", async () => {
    const created = await api("PUT", "/users/me/cv", {
        token: c1.token,
        body: { about: "Desarrolladora backend", skills: "Node.js, MySQL, Docker", work_experience: "2 años en X", education: "Grado en Informática", resume_url: "https://example.com/cv.pdf" }
    });
    expect(created.status).toBe(200);
    expect(created.data).toMatchObject({ skills: "Node.js, MySQL, Docker", about: "Desarrolladora backend" });

    const partial = await api("PUT", "/users/me/cv", { token: c1.token, body: { skills: "Node.js, MySQL, Docker, Python" } });
    expect(partial.data).toMatchObject({ id: created.data.id, about: "Desarrolladora backend", skills: "Node.js, MySQL, Docker, Python" });

    const cleared = await api("PUT", "/users/me/cv", { token: c1.token, body: { about: null } });
    expect(cleared.data).toMatchObject({ about: null, education: "Grado en Informática" });
});

test("5 PUT simultáneos sobre un CV nuevo crean una sola fila (UNIQUE + upsert)", async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => api("PUT", "/users/me/cv", { token: c2.token, body: { about: `v${i}` } })));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(new Set(results.map((r) => r.data.id)).size).toBe(1);
    const own = await api("GET", "/users/me/cv", { token: c2.token });
    expect(own.data.skills).toBeNull(); // es el de c2, no el de c1
});

test("job-match: sin skills en el body usa las del CV", async () => {
    const fromCv = await api("POST", "/ai/job-match", { token: c1.token, body: { job_offer_id: job.id } });
    expect(fromCv.status).toBe(200);
    expect(fromCv.data.skills_source).toBe("cv");
    expect(fromCv.data.matched_skills).toContain("mysql");

    expect((await api("POST", "/ai/job-match", { token: c2.token, body: { job_offer_id: job.id } })).status).toBe(400);
    const fromBody = await api("POST", "/ai/job-match", { token: c2.token, body: { job_offer_id: job.id, skills: "Kubernetes" } });
    expect(fromBody.data.skills_source).toBe("body");
    expect((await api("POST", "/ai/job-match", { token: c1.token, body: { job_offer_id: job.id, skills: "   " } })).status).toBe(400);
});

test("/ai/ask: el encaje con una oferta usa el CV si hay habilidades", async () => {
    const withCv = await api("POST", "/ai/ask", { token: c1.token, body: { message: `¿encajo en la oferta ${job.title}?` } });
    expect(withCv.data).toMatchObject({ type: "answer", skills_source: "cv" });
    const withoutCv = await api("POST", "/ai/ask", { token: c2.token, body: { message: `¿encajo en la oferta ${job.title}?` } });
    expect(withoutCv.data).toMatchObject({ type: "answer", skills_source: "message" });
});

test("la empresa ve el CV solo si el candidato lo compartió al postularse", async () => {
    expect((await api("POST", "/applications", { token: c1.token, body: { job_offer_id: job.id, consent: true, consent_cv: "yes", signature: "x" } })).status).toBe(400);
    const a1 = await api("POST", "/applications", { token: c1.token, body: { job_offer_id: job.id, consent: true, consent_cv: true, signature: "PW cv_c1" } });
    expect(a1.data.consent_share_cv).toBe(true);
    await api("PUT", "/users/me/cv", { token: c2.token, body: { skills: "Secreto de c2", education: "Privada" } });
    const a2 = await api("POST", "/applications", { token: c2.token, body: { job_offer_id: job.id, consent: true, signature: "PW cv_c2" } });
    expect(a2.data.consent_share_cv).toBe(false);

    const list = (await api("GET", "/applications/recruiter", { token: r1.token })).data.filter((a) => a.job_offer_id === job.id);
    expect(list).toHaveLength(2); // el LEFT JOIN con user_profiles no duplica filas
    const v1 = list.find((a) => a.id === a1.data.id);
    const v2 = list.find((a) => a.id === a2.data.id);
    expect(v1).toMatchObject({ cv_education: "Grado en Informática", cv_resume_url: "https://example.com/cv.pdf" });
    expect(v1.cv_skills).toContain("Python");
    expect(v2).toMatchObject({ cv_skills: null, cv_education: null, cv_about: null, cv_resume_url: null, cv_work_experience: null });

    const other = await api("GET", "/applications/recruiter", { token: r2.token });
    expect(other.data.some((a) => a.job_offer_id === job.id)).toBe(false);
});

test("DELETE borra solo el CV y la empresa deja de verlo", async () => {
    expect((await api("DELETE", "/users/me/cv", { token: c1.token })).status).toBe(200);
    expect((await api("DELETE", "/users/me/cv", { token: c1.token })).status).toBe(404);
    expect((await api("GET", "/users/me", { token: c1.token })).status).toBe(200);
    const list = (await api("GET", "/applications/recruiter", { token: r1.token })).data;
    const v1 = list.find((a) => a.candidate_name === c1.name);
    expect(v1).toMatchObject({ consent_share_cv: 1, cv_skills: null });
});
