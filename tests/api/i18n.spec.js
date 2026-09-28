// Mensajes de la API en 4 idiomas según Accept-Language (docs/decisions.md,
// entrada 038). Los intentos de login fallidos se prueban aparte, en
// login-rate-limit.spec.js, para no gastar el límite de intentos del servidor
// compartido.
import { test, expect } from "@playwright/test";
import { api, TestData, BASE_URL } from "../helpers.js";
import { MESSAGES, FIELD_LABELS } from "../../backend/i18n/messages.js";

test.describe.configure({ mode: "serial" });

const data = new TestData();
let cand, rec;

test.beforeAll(async () => {
    [cand, rec] = await Promise.all([data.user("candidate", "i18n_c"), data.user("recruiter", "i18n_r")]);
});

test.afterAll(async () => { await data.cleanup(); });

test("diccionario: los 4 idiomas tienen las mismas claves, marcadores y campos", async () => {
    const langs = Object.keys(MESSAGES);
    expect(langs).toEqual(["es", "en", "fr", "it"]);
    const esKeys = Object.keys(MESSAGES.es).sort();
    const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const lang of langs) {
        expect(Object.keys(MESSAGES[lang]).sort(), `claves de ${lang}`).toEqual(esKeys);
        expect(Object.keys(FIELD_LABELS[lang]).sort(), `campos de ${lang}`).toEqual(Object.keys(FIELD_LABELS.es).sort());
        for (const key of esKeys) {
            expect(placeholders(MESSAGES[lang][key]), `${lang}.${key}`).toBe(placeholders(MESSAGES.es[key]));
            if (lang !== "es") expect(MESSAGES[lang][key], `${lang}.${key} sin traducir`).not.toBe(MESSAGES.es[key]);
        }
    }
});

const noTokenMessage = async (lang) => (await api("GET", "/users/me", { lang })).data.message;

test("detección del idioma", async () => {
    const es = "No se proporcionó un token de autenticación";
    expect(await noTokenMessage(undefined), "sin cabecera").toBe(es);
    expect(await noTokenMessage("en")).toBe("No authentication token was provided");
    expect(await noTokenMessage("fr-FR,fr;q=0.9")).toBe("Aucun jeton d'authentification n'a été fourni");
    expect(await noTokenMessage("it-IT")).toBe("Non è stato fornito alcun token di autenticazione");
    expect(await noTokenMessage("de-DE,de;q=0.9,it;q=0.5"), "primer idioma disponible").toBe("Non è stato fornito alcun token di autenticazione");
    expect(await noTokenMessage("en;q=0.2,fr;q=0.8"), "orden por q").toMatch(/^Aucun jeton/);
    expect(await noTokenMessage("de"), "idioma no disponible").toBe(es);
    expect(await noTokenMessage("*")).toBe(es);
    expect(await noTokenMessage(";;;q=,,,"), "cabecera basura").toBe(es);
});

const EXPECT = {
    es: { invalidToken: "Token de autenticación no válido", forbidden: "No tienes permisos para realizar esta acción", route: "Ruta no encontrada: GET /api/nope", json: "El cuerpo de la petición no es un JSON válido", validation: "Datos de entrada no válidos", nameRequired: "Nombre: este campo es obligatorio", signature: "Firma: no puede superar 150 caracteres", appNotFound: "Postulación no encontrada", updated: "Perfil actualizado correctamente", oneOf: "Estado: debe ser uno de estos valores: applied, interview, offer, rejected" },
    en: { invalidToken: "Invalid authentication token", forbidden: "You don't have permission to do this", route: "Route not found: GET /api/nope", json: "The request body is not valid JSON", validation: "Invalid input data", nameRequired: "Name: this field is required", signature: "Signature: cannot be longer than 150 characters", appNotFound: "Application not found", updated: "Profile updated successfully", oneOf: "Status: must be one of these values: applied, interview, offer, rejected" },
    fr: { invalidToken: "Jeton d'authentification non valide", forbidden: "Vous n'avez pas l'autorisation d'effectuer cette action", route: "Route introuvable : GET /api/nope", json: "Le corps de la requête n'est pas un JSON valide", validation: "Données saisies non valides", nameRequired: "Nom : ce champ est obligatoire", signature: "Signature : ne peut pas dépasser 150 caractères", appNotFound: "Candidature introuvable", updated: "Profil mis à jour avec succès", oneOf: "Statut : doit être l'une de ces valeurs : applied, interview, offer, rejected" },
    it: { invalidToken: "Token di autenticazione non valido", forbidden: "Non hai i permessi per eseguire questa azione", route: "Percorso non trovato: GET /api/nope", json: "Il corpo della richiesta non è un JSON valido", validation: "Dati inseriti non validi", nameRequired: "Nome: questo campo è obbligatorio", signature: "Firma: non può superare 150 caratteri", appNotFound: "Candidatura non trovata", updated: "Profilo aggiornato correttamente", oneOf: "Stato: deve essere uno di questi valori: applied, interview, offer, rejected" }
};

for (const [lang, e] of Object.entries(EXPECT)) {
    test(`un mensaje de cada tipo en ${lang}`, async () => {
        let r = await api("GET", "/users/me", { lang, token: "no-es-un-token" });
        expect(r.data.message, "401").toBe(e.invalidToken);
        r = await api("GET", "/applications/recruiter", { lang, token: cand.token });
        expect(r.data.message, "403").toBe(e.forbidden);
        r = await api("GET", "/nope", { lang });
        expect(r.data.message, "ruta inexistente").toBe(e.route);
        r = await api("POST", "/users", { lang, raw: "{esto no es json" });
        expect(r.data.message, "JSON mal formado").toBe(e.json);

        r = await api("POST", "/users", { lang, body: { email: "no-es-email", password: "x" } });
        expect(r.status).toBe(400);
        expect(r.data.message).toBe(e.validation);
        expect(r.data.errors.map((x) => x.message)).toContain(e.nameRequired);
        expect(r.data.errors.some((x) => x.field === "name"), "field sigue siendo técnico").toBe(true);

        r = await api("POST", "/applications", { lang, token: cand.token, body: { consent: true, signature: "x".repeat(151) } });
        expect(r.data.errors.map((x) => x.message), "plantilla con {max}").toContain(e.signature);
        r = await api("PUT", "/applications/999999999/status", { lang, token: rec.token, body: { status: "nope" } });
        expect(r.data.errors.map((x) => x.message), "plantilla con {values}").toContain(e.oneOf);
        r = await api("DELETE", "/applications/999999999", { lang, token: cand.token });
        expect(r.data.message, "404").toBe(e.appNotFound);
        r = await api("PUT", "/users/me", { lang, token: cand.token, body: { location: "Valencia" } });
        expect(r.data.message, "éxito").toBe(e.updated);
    });
}

test("Vary: Accept-Language solo en la API", async () => {
    const r = await api("GET", "/users/me", { lang: "en" });
    expect(r.headers.get("vary") || "").toContain("Accept-Language");
    const page = await fetch(`${BASE_URL}/privacy.html`);
    expect(page.headers.get("vary") || "").not.toContain("Accept-Language");
});

test("asistente IA: sin 'lang' usa el idioma de la petición; con 'lang', manda el body", async () => {
    let r = await api("POST", "/ai/ask", { lang: "fr", token: cand.token, body: { message: "¿qué tiempo hace hoy?" } });
    expect(r.data.type).toBe("off_topic");
    expect(r.data.message).toMatch(/^Je peux seulement/);
    r = await api("POST", "/ai/ask", { lang: "fr", token: cand.token, body: { message: "¿qué tiempo hace hoy?", lang: "it" } });
    expect(r.data.message).toMatch(/^Posso aiutarti/);
});
