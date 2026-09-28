// Datos de demostración para grabar el vídeo y hacer capturas (ver
// docs/demoVideo.md y docs/decisions.md, entrada 044).
//
//   npm run demo:data
//
// Vacía la base de DEMOSTRACIÓN (por defecto "hireflow_demo") y la rellena
// con un escenario completo: 3 empresas de sectores distintos, 13 ofertas,
// 8 candidatos con CV, postulaciones en todas las columnas del Kanban,
// entrevistas esta semana y la siguiente, avisos sin ver y consentimientos
// variados. Todo se crea a través de la API (así se cumplen las reglas de la
// app) y solo las fechas se ajustan directamente en la base, para que no
// salga todo "Publicada hoy".
//
// Por seguridad, solo trabaja sobre una base cuyo nombre acabe en "_demo":
// nunca puede vaciar la base de desarrollo.
//
// Las entrevistas se programan a partir de HOY: ejecútalo el mismo día que
// vayas a grabar, mejor de lunes a jueves (así hay entrevistas "esta semana").
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireBackend = createRequire(path.join(ROOT, "backend/package.json"));
const mysql = requireBackend("mysql2/promise");
requireBackend("dotenv").config({ path: path.join(ROOT, "backend/.env"), quiet: true });

const DEMO_DB = process.env.DEMO_DB_NAME || "hireflow_demo";
export const DEMO_PASSWORD = "Demo2026!";

if (!DEMO_DB.endsWith("_demo")) {
    console.error(`Por seguridad solo se rellena una base que acabe en "_demo" (recibido: "${DEMO_DB}").`);
    process.exit(1);
}

// ---------------------------------------------------------------------------
// El escenario
// ---------------------------------------------------------------------------

const RECRUITERS = {
    marta: { name: "Marta Gil", email: "marta.gil@example.com", sector: "Tecnología", phone: "600 000 101", location: "Valencia" },
    javier: { name: "Javier Ruiz", email: "javier.ruiz@example.com", sector: "Sanidad", phone: "600 000 102", location: "Madrid" },
    elena: { name: "Elena Martí", email: "elena.marti@example.com", sector: "Diseño", phone: "600 000 103", location: "Barcelona" }
};

const COMPANIES = {
    nexa: { owner: "marta", name: "Nexa Digital", email: "rrhh@nexadigital.example.com", industry: "Tecnología", location: "Valencia", description: "Consultora de producto digital: webs, apps y plataformas a medida." },
    brisa: { owner: "marta", name: "Brisa Software", email: "empleo@brisasoftware.example.com", industry: "Tecnología", location: "Alicante", description: "Software de gestión para pymes." },
    clinica: { owner: "javier", name: "Clínica Mediterránea", email: "seleccion@clinicamediterranea.example.com", industry: "Sanidad", location: "Madrid", description: "Hospital privado con 200 camas y centro de especialidades." },
    brava: { owner: "elena", name: "Estudio Brava", email: "hola@estudiobrava.example.com", industry: "Diseño", location: "Barcelona", description: "Estudio de diseño de producto y marca." },
    atlas: { owner: "elena", name: "Atlas Retail", email: "talento@atlasretail.example.com", industry: "Comercio", location: "Barcelona", description: "Cadena de tiendas de moda sostenible." }
};

// daysAgo: cuándo se publicó (para "Publicada hace N días")
const JOBS = {
    frontend: { company: "nexa", daysAgo: 3, title: "Desarrolladora Frontend", location: "Valencia (híbrido)", employment_type: "full_time", salary: "2200", skills_required: "JavaScript, React, CSS, Accesibilidad, Git", description: "Buscamos una persona para construir interfaces accesibles y rápidas en proyectos de clientes. Equipo de 8 personas, dos días de oficina a la semana." },
    fullstack: { company: "brisa", daysAgo: 6, title: "Full Stack Node.js", location: "Alicante", employment_type: "permanent", salary: "experience", skills_required: "Node.js, Express, MySQL, JavaScript, Docker", description: "Mantenimiento y nuevas funcionalidades de nuestro ERP para pymes." },
    junior: { company: "nexa", daysAgo: 1, title: "Junior Web Developer", location: "Remoto", employment_type: "full_time", salary: "1600", skills_required: "HTML, CSS, JavaScript, Git", description: "Primer empleo o prácticas: te acompaña una mentora durante los primeros seis meses." },
    backend: { company: "brisa", daysAgo: 12, title: "Backend Node.js y MySQL", location: "Alicante (híbrido)", employment_type: "permanent", salary: "1900", skills_required: "Node.js, MySQL, API REST, Seguridad, Testing", description: "Diseño de APIs y optimización de consultas para el nuevo módulo de facturación." },
    maquetadora: { company: "nexa", daysAgo: 18, title: "Maquetadora web", location: "Valencia", employment_type: "part_time", salary: "1600", skills_required: "HTML, CSS, Figma, Responsive", description: "Media jornada de mañanas, maquetación de landings y emails." },
    qa: { company: "brisa", daysAgo: 9, title: "QA Automation", location: "Alicante (híbrido)", employment_type: "full_time", salary: "1900", skills_required: "Playwright, Testing, JavaScript, CI", description: "Automatización de pruebas de extremo a extremo e integración continua." },
    enfermeria: { company: "clinica", daysAgo: 4, title: "Enfermera/o de quirófano", location: "Madrid", employment_type: "permanent", salary: "2200", skills_required: "Quirófano, Instrumentación, Trabajo en equipo", description: "Turnos rotativos en el bloque quirúrgico. Se valora experiencia en traumatología." },
    recepcion: { company: "clinica", daysAgo: 15, title: "Recepcionista sanitario/a", location: "Madrid", employment_type: "part_time", salary: "min_wage", skills_required: "Atención al cliente, Organización, Inglés", description: "Atención presencial y telefónica en consultas externas, turno de tarde." },
    laboratorio: { company: "clinica", daysAgo: 22, title: "Técnico/a de laboratorio", location: "Madrid", employment_type: "short_term", salary: "1600", skills_required: "Análisis clínicos, Atención al detalle", description: "Sustitución de seis meses con posibilidad de continuidad." },
    ux: { company: "brava", daysAgo: 5, title: "Diseñadora UX/UI", location: "Barcelona (híbrido)", employment_type: "full_time", salary: "2200", skills_required: "Figma, Research, Prototipado, Accesibilidad, Design systems", description: "Producto digital para clientes de salud y educación." },
    community: { company: "brava", daysAgo: 11, title: "Community manager", location: "Remoto", employment_type: "part_time", salary: "negotiable", skills_required: "Redes sociales, Copywriting, Analítica", description: "Gestión de redes del estudio y de dos clientes." },
    tienda: { company: "atlas", daysAgo: 2, title: "Dependiente/a de tienda", location: "Barcelona", employment_type: "hourly", salary: "min_wage", skills_required: "Atención al cliente, Ventas, Trabajo en equipo", description: "Fines de semana en la tienda del centro." },
    visual: { company: "atlas", daysAgo: 25, title: "Visual merchandiser", location: "Barcelona", employment_type: "full_time", salary: "1900", skills_required: "Diseño, Escaparatismo, Creatividad", description: "Escaparates y exposición de producto en 12 tiendas." }
};

const CANDIDATES = {
    lucia: {
        name: "Lucía Navarro", email: "lucia.navarro@example.com", sector: "Desarrollo web", phone: "600 000 001", location: "Valencia",
        cv: { about: "Desarrolladora frontend con foco en accesibilidad.\nMe gusta que las interfaces funcionen para todo el mundo.", skills: "JavaScript, React, CSS, HTML, Accesibilidad, Git, Figma", work_experience: "2024–2026 · Desarrolladora frontend en una agencia de Valencia (webs de comercio electrónico).\n2023 · Prácticas en un estudio de diseño.", education: "Desarrollo de Aplicaciones Web (DAW), 2023.\nCurso de accesibilidad web (WCAG 2.1), 2024.", resume_url: "https://example.com/cv-lucia-navarro.pdf" }
    },
    pablo: {
        name: "Pablo Ortega", email: "pablo.ortega@example.com", sector: "Desarrollo backend", phone: "600 000 002", location: "Alicante",
        cv: { about: "Backend con Node.js y bases de datos.", skills: "Node.js, Express, MySQL, API REST, Docker, Testing", work_experience: "2022–2026 · Backend en una startup de logística.", education: "Grado en Ingeniería Informática, Universidad de Alicante." }
    },
    irene: {
        name: "Irene Soler", email: "irene.soler@example.com", sector: "Calidad (QA)", phone: "600 000 003", location: "Alicante",
        cv: { about: "QA con experiencia en automatización.", skills: "Playwright, Testing, JavaScript, CI, Jira", work_experience: "2021–2026 · QA en una consultora.", education: "DAM, 2021." }
    },
    carlos: {
        name: "Carlos Beltrán", email: "carlos.beltran@example.com", sector: "Enfermería", phone: "600 000 004", location: "Madrid",
        cv: { about: "Enfermero con 6 años en quirófano.", skills: "Quirófano, Instrumentación, Trabajo en equipo, Urgencias", work_experience: "2020–2026 · Enfermero de quirófano en un hospital público.", education: "Grado en Enfermería. Máster en cuidados quirúrgicos." }
    },
    sara: {
        name: "Sara Iborra", email: "sara.iborra@example.com", sector: "Diseño UX/UI", phone: "600 000 005", location: "Barcelona",
        cv: { about: "Diseñadora de producto: investigación, prototipos y sistemas de diseño.", skills: "Figma, Research, Prototipado, Design systems, HTML, CSS", work_experience: "2022–2026 · Diseñadora UX en una fintech.", education: "Grado en Diseño, Escola Massana." }
    },
    diego: {
        name: "Diego Ramos", email: "diego.ramos@example.com", sector: "Desarrollo web", phone: "600 000 006", location: "Valencia",
        cv: null // sin CV: para enseñar el aviso "no lo ha rellenado"
    },
    nuria: {
        name: "Nuria Ferrer", email: "nuria.ferrer@example.com", sector: "Marketing", phone: "600 000 007", location: "Barcelona",
        cv: { about: "Marketing digital y contenidos.", skills: "Redes sociales, Copywriting, Analítica, SEO", work_experience: "2023–2026 · Community manager freelance.", education: "Grado en Publicidad y Relaciones Públicas." }
    },
    andres: {
        name: "Andrés Molina", email: "andres.molina@example.com", sector: "Atención al cliente", phone: "600 000 008", location: "Madrid",
        cv: { about: "Atención al cliente en entornos sanitarios.", skills: "Atención al cliente, Organización, Inglés, Ventas", work_experience: "2019–2026 · Recepción en un centro médico.", education: "Técnico en Gestión Administrativa." }
    }
};

// status: cómo acaba la postulación (la mueve la empresa, como en la app).
// daysAgo: cuándo se postuló. cv/contact: consentimientos al postularse.
const APPLICATIONS = [
    // Nexa y Brisa (Marta): todas las columnas del Kanban
    { cand: "lucia", job: "frontend", status: "interview", daysAgo: 2, cv: true, notes: "Preparar ejemplos de accesibilidad del proyecto de la agencia." },
    { cand: "diego", job: "frontend", status: "applied", daysAgo: 1, cv: true },
    { cand: "irene", job: "frontend", status: "rejected", daysAgo: 3 },
    { cand: "sara", job: "frontend", status: "applied", daysAgo: 1, cv: true },
    { cand: "lucia", job: "fullstack", status: "applied", daysAgo: 4, cv: true },
    { cand: "pablo", job: "fullstack", status: "offer", daysAgo: 6, cv: true, notes: "Me han hecho oferta: revisar condiciones." },
    { cand: "diego", job: "junior", status: "interview", daysAgo: 1, cv: true },
    { cand: "nuria", job: "junior", status: "applied", daysAgo: 1 },
    { cand: "pablo", job: "backend", status: "interview", daysAgo: 10, cv: true },
    { cand: "irene", job: "qa", status: "interview", daysAgo: 8, cv: true },
    { cand: "sara", job: "maquetadora", status: "offer", daysAgo: 15, cv: true },
    { cand: "lucia", job: "maquetadora", status: "rejected", daysAgo: 16, cv: true },
    // Clínica Mediterránea (Javier)
    { cand: "carlos", job: "enfermeria", status: "interview", daysAgo: 3, cv: true },
    { cand: "andres", job: "recepcion", status: "offer", daysAgo: 12, cv: true },
    { cand: "andres", job: "laboratorio", status: "rejected", daysAgo: 20, withdrawContact: true },
    // Estudio Brava y Atlas (Elena)
    { cand: "sara", job: "ux", status: "interview", daysAgo: 4, cv: true },
    { cand: "lucia", job: "ux", status: "rejected", daysAgo: 5, cv: true },
    { cand: "nuria", job: "community", status: "applied", daysAgo: 9, cv: true },
    { cand: "andres", job: "tienda", status: "applied", daysAgo: 1 },
    { cand: "nuria", job: "visual", status: "rejected", daysAgo: 21 }
];

// Entrevistas: [candidata, oferta, en cuántos días hábiles, hora, lugar]
const INTERVIEWS = [
    ["lucia", "frontend", 1, "10:00", "Oficina de Nexa Digital, Valencia"],
    ["diego", "junior", 1, "16:30", "Videollamada"],
    ["pablo", "backend", 2, "12:00", "Videollamada"],
    ["irene", "qa", 3, "09:30", "Oficina de Brisa Software, Alicante"],
    ["carlos", "enfermeria", 2, "11:00", "Clínica Mediterránea, planta 2"],
    ["sara", "ux", 6, "10:30", "Estudio Brava, Barcelona"]
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const freePort = () => new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => { const { port } = server.address(); server.close(() => resolve(port)); });
});

const startDemoServer = async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ["server.js"], {
        cwd: path.join(ROOT, "backend"),
        env: { ...process.env, DB_NAME: DEMO_DB, PORT: String(port) },
        stdio: "ignore"
    });
    const base = `http://localhost:${port}/api`;
    for (let i = 0; i < 80; i++) {
        try { await fetch(`http://localhost:${port}/privacy.html`); return { base, stop: () => child.kill() }; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    child.kill();
    throw new Error("No arrancó el servidor de demostración");
};

let API;
const call = async (method, url, token, body) => {
    const res = await fetch(`${API}${url}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
    return data;
};

const signUp = async (person, role) => {
    await call("POST", "/users", null, { name: person.name, email: person.email, password: DEMO_PASSWORD, role, termsAccepted: true });
    const { token } = await call("POST", "/users/login", null, { email: person.email, password: DEMO_PASSWORD });
    await call("PUT", "/users/me", token, { sector: person.sector, phone: person.phone, location: person.location });
    return token;
};

// Próximo día hábil (lunes a viernes) a N días hábiles de hoy
const businessDay = (offset) => {
    const date = new Date();
    let added = 0;
    while (added < offset) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0 && date.getDay() !== 6) added++;
    }
    return date;
};
const pad = (n) => String(n).padStart(2, "0");
const mysqlDate = (date, time) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}:00`;

// ---------------------------------------------------------------------------
// Vaciar la base de demostración
// ---------------------------------------------------------------------------

const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: DEMO_DB
});
console.log(`Vaciando ${DEMO_DB} (se conservan el catálogo del asistente y los tipos de entrevista)...`);
// Borrar usuarios, empresas y ofertas arrastra en cascada postulaciones,
// entrevistas, CV, notas, eventos y contactos.
await db.query("DELETE FROM job_offers");
await db.query("DELETE FROM companies");
await db.query("DELETE FROM users");

// ---------------------------------------------------------------------------
// Crear el escenario a través de la API
// ---------------------------------------------------------------------------

const server = await startDemoServer();
API = server.base;
try {
    const tokens = {};
    for (const [key, person] of Object.entries(RECRUITERS)) tokens[key] = await signUp(person, "recruiter");
    for (const [key, person] of Object.entries(CANDIDATES)) {
        tokens[key] = await signUp(person, "candidate");
        if (person.cv) await call("PUT", "/users/me/cv", tokens[key], person.cv);
    }

    const companyIds = {};
    for (const [key, company] of Object.entries(COMPANIES)) {
        const { owner, ...body } = company;
        companyIds[key] = (await call("POST", "/companies", tokens[owner], body)).id;
    }

    const jobIds = {};
    for (const [key, job] of Object.entries(JOBS)) {
        const { company, daysAgo, ...body } = job;
        const owner = COMPANIES[company].owner;
        jobIds[key] = (await call("POST", "/jobs", tokens[owner], { ...body, company_id: companyIds[company] })).id;
        await db.query("UPDATE job_offers SET created_at = NOW() - INTERVAL ? DAY - INTERVAL ? HOUR WHERE id = ?", [daysAgo, (daysAgo * 5) % 9, jobIds[key]]);
    }

    const appIds = {};
    for (const app of APPLICATIONS) {
        const owner = COMPANIES[JOBS[app.job].company].owner;
        const created = await call("POST", "/applications", tokens[app.cand], {
            job_offer_id: jobIds[app.job], consent: true, consent_cv: Boolean(app.cv), signature: CANDIDATES[app.cand].name
        });
        appIds[`${app.cand}:${app.job}`] = created.id;
        if (app.notes) await call("PUT", `/applications/${created.id}`, tokens[app.cand], { notes: app.notes });
        // Las entrevistas se programan después (pasan la postulación a "interview")
        if (app.status !== "applied" && app.status !== "interview") {
            await call("PUT", `/applications/${created.id}/status`, tokens[owner], { status: app.status });
        }
        if (app.withdrawContact) await call("PUT", `/applications/${created.id}/consent`, tokens[app.cand], { consent_contact: false });
        await db.query(
            "UPDATE applications SET created_at = NOW() - INTERVAL ? DAY, applied_date = CURDATE() - INTERVAL ? DAY WHERE id = ?",
            [app.daysAgo, app.daysAgo, created.id]
        );
    }

    for (const [cand, job, inDays, time, location] of INTERVIEWS) {
        const owner = COMPANIES[JOBS[job].company].owner;
        await call("POST", "/interviews", tokens[owner], { application_id: appIds[`${cand}:${job}`], scheduled_date: mysqlDate(businessDay(inDays), time), location });
    }

    // Los cambios de estado antiguos ya se han visto; solo las dos entrevistas
    // recién programadas de Lucía y Diego quedan "sin ver" (el aviso de Inicio
    // y la etiqueta "¡Actualizado por la empresa!").
    await db.query("UPDATE applications SET status_seen_by_candidate = 1");
    await db.query("UPDATE applications SET status_seen_by_candidate = 0 WHERE id IN (?, ?)", [appIds["lucia:frontend"], appIds["diego:junior"]]);

    const [[counts]] = await db.query(`SELECT
        (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM companies) companies, (SELECT COUNT(*) FROM job_offers) jobs,
        (SELECT COUNT(*) FROM applications) applications, (SELECT COUNT(*) FROM interviews) interviews, (SELECT COUNT(*) FROM user_profiles) cvs`);
    console.log("Listo:", counts);
    console.log(`\nCuentas (contraseña de todas: ${DEMO_PASSWORD})`);
    console.log(`  Empresa:   ${RECRUITERS.marta.email}  (Nexa Digital y Brisa Software: el Kanban más completo)`);
    console.log(`  Candidata: ${CANDIDATES.lucia.email}  (CV, entrevista mañana y un aviso sin ver)`);
    console.log(`  Otras: ${[...Object.values(RECRUITERS).slice(1), ...Object.values(CANDIDATES).slice(1)].map((p) => p.email).join(", ")}`);
} finally {
    server.stop();
    await db.end();
}
