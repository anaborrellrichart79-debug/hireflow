// Límites de propiedad y de rol: nadie ve ni toca lo de otro usuario.
// Entradas 001, 002, 003, 005, 017, 018, 019, 023 y 027 de docs/decisions.md.
import { test, expect } from "@playwright/test";
import { api, TestData } from "../helpers.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let cand1, cand2, rec1, rec2, company1, job1, app1;

test.beforeAll(async () => {
    [cand1, cand2, rec1, rec2] = await Promise.all([
        data.user("candidate", "sec_c1"), data.user("candidate", "sec_c2"),
        data.user("recruiter", "sec_r1"), data.user("recruiter", "sec_r2")
    ]);
    company1 = await data.company(rec1);
    job1 = await data.job(rec1, company1, { skills_required: "Node.js" });
    const r = await api("POST", "/applications", { token: cand1.token, body: { job_offer_id: job1.id, consent: true, signature: "PW sec_c1" } });
    expect(r.status).toBe(201);
    app1 = r.data;
});

test.afterAll(async () => { await data.cleanup(); });

test("sin token, las rutas protegidas responden 401", async () => {
    for (const [method, url] of [["GET", "/users/me"], ["GET", "/applications"], ["GET", "/jobs"], ["GET", "/interviews"], ["POST", "/ai/ask"]]) {
        expect((await api(method, url)).status, `${method} ${url}`).toBe(401);
    }
});

test("GET /users ya no existe: no expone los datos de todos los usuarios (entrada 018)", async () => {
    expect((await api("GET", "/users", { token: cand1.token })).status).toBe(404);
});

test("una postulación solo la ve y la toca su candidato (IDOR, entrada 001)", async () => {
    expect((await api("GET", `/applications/${app1.id}`, { token: cand1.token })).status).toBe(200);
    expect((await api("GET", `/applications/${app1.id}`, { token: cand2.token })).status).toBe(404);
    expect((await api("PUT", `/applications/${app1.id}`, { token: cand2.token, body: { notes: "hackeo" } })).status).toBe(404);
    expect((await api("DELETE", `/applications/${app1.id}`, { token: cand2.token })).status).toBe(404);
    const list = await api("GET", "/applications", { token: cand2.token });
    expect(list.data.some((a) => a.id === app1.id)).toBe(false);
});

test("una postulación a una oferta nace como 'applied' y no se puede repetir (entradas 023 y 027)", async () => {
    expect(app1.status).toBe("applied");
    const again = await api("POST", "/applications", { token: cand1.token, body: { job_offer_id: job1.id, consent: true, signature: "PW sec_c1" } });
    expect(again.status).toBe(409);
});

test("el candidato no puede cambiar el estado que gestiona la empresa (entrada 023)", async () => {
    const r = await api("PUT", `/applications/${app1.id}`, { token: cand1.token, body: { status: "offer" } });
    expect(r.status).toBe(403);
    const notes = await api("PUT", `/applications/${app1.id}`, { token: cand1.token, body: { notes: "mis notas" } });
    expect(notes.status).toBe(200);
});

test("solo los recruiters crean ofertas y empresas (entrada 003)", async () => {
    expect((await api("POST", "/companies", { token: cand1.token, body: { name: "X", email: "x@test.local" } })).status).toBe(403);
    expect((await api("POST", "/jobs", { token: cand1.token, body: { company_id: company1.id, title: "X" } })).status).toBe(403);
    expect((await api("GET", "/applications/recruiter", { token: cand1.token })).status).toBe(403);
});

test("un recruiter no toca las ofertas ni la empresa de otro (entradas 017 y 019)", async () => {
    expect((await api("PUT", `/jobs/${job1.id}`, { token: rec2.token, body: { title: "Robada" } })).status).toBe(404);
    expect((await api("DELETE", `/jobs/${job1.id}`, { token: rec2.token })).status).toBe(404);
    expect((await api("PUT", `/companies/${company1.id}`, { token: rec2.token, body: { name: "Robada" } })).status).toBe(404);
    expect((await api("DELETE", `/companies/${company1.id}`, { token: rec2.token })).status).toBe(404);
    const post = await api("POST", "/jobs", { token: rec2.token, body: { company_id: company1.id, title: "En empresa ajena" } });
    expect(post.status).toBe(400);
    const job = await api("GET", `/jobs/${job1.id}`, { token: rec1.token });
    expect(job.data.title).not.toBe("Robada");
});

test("no se borra una empresa con ofertas (entrada 019)", async () => {
    expect((await api("DELETE", `/companies/${company1.id}`, { token: rec1.token })).status).toBe(409);
});

test("un recruiter solo ve y gestiona los postulantes de sus ofertas (entrada 017)", async () => {
    const own = await api("GET", "/applications/recruiter", { token: rec1.token });
    expect(own.data.some((a) => a.id === app1.id)).toBe(true);
    const other = await api("GET", "/applications/recruiter", { token: rec2.token });
    expect(other.data.some((a) => a.id === app1.id)).toBe(false);
    expect((await api("PUT", `/applications/${app1.id}/status`, { token: rec2.token, body: { status: "rejected" } })).status).toBe(404);
    expect((await api("PUT", `/applications/${app1.id}/status`, { token: rec1.token, body: { status: "wishlist" } })).status).toBe(400);
});

test("las notas privadas del candidato nunca llegan a la empresa (entrada 017)", async () => {
    const own = await api("GET", "/applications/recruiter", { token: rec1.token });
    const a = own.data.find((x) => x.id === app1.id);
    expect(a).not.toHaveProperty("notes");
});

test("entrevistas: solo sobre postulaciones propias o de ofertas propias (entradas 005 y 017)", async () => {
    const date = "2031-05-10 10:00:00";
    expect((await api("POST", "/interviews", { token: rec2.token, body: { application_id: app1.id, scheduled_date: date } })).status).toBe(404);
    expect((await api("POST", "/interviews", { token: cand2.token, body: { application_id: app1.id, scheduled_date: date } })).status).toBe(404);
    const created = await api("POST", "/interviews", { token: rec1.token, body: { application_id: app1.id, scheduled_date: date } });
    expect(created.status).toBe(201);
    const candView = await api("GET", "/interviews", { token: cand1.token });
    expect(candView.data.some((i) => i.id === created.data.id)).toBe(true);
    const otherView = await api("GET", "/interviews", { token: cand2.token });
    expect(otherView.data.some((i) => i.id === created.data.id)).toBe(false);
    expect((await api("DELETE", `/interviews/${created.data.id}`, { token: rec2.token })).status).toBe(404);
});

test("el perfil propio no admite ver ni borrar el de otro (/users/me, entrada 002)", async () => {
    const me = await api("GET", "/users/me", { token: cand1.token });
    expect(me.data.email).toBe(cand1.email);
    expect(me.data).not.toHaveProperty("password_hash");
});
