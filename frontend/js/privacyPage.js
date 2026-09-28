// Página pública de la Política de Privacidad (privacy.html). Sin sesión ni
// router: se puede abrir desde cualquier sitio (Google Play, un email...) y
// también se publica sola en GitHub Pages. Por eso solo depende de
// privacyPolicyContent.js. Ver docs/decisions.md, entrada 035.
import { PRIVACY_POLICY_CONTENT, getPrivacyPolicy } from "./privacyPolicyContent.js";

const AVAILABLE = Object.keys(PRIVACY_POLICY_CONTENT); // es, en, fr, it
const LANG_NAMES = { es: "Español", en: "English", fr: "Français", it: "Italiano" };
// Nombre accesible del selector de idioma, en el idioma de la página
const LANG_LABEL = { es: "Idioma", en: "Language", fr: "Langue", it: "Lingua" };

// Idioma: ?lang= en la URL > el que eligió en la app > el del navegador > español
const pickLang = () => {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (AVAILABLE.includes(fromUrl)) return fromUrl;
    try {
        const fromApp = localStorage.getItem("hireflow_lang");
        if (AVAILABLE.includes(fromApp)) return fromApp;
    } catch {
        // localStorage bloqueado: se sigue con el idioma del navegador
    }
    const fromBrowser = (navigator.language || "").slice(0, 2);
    return AVAILABLE.includes(fromBrowser) ? fromBrowser : "es";
};

const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
};

const lang = pickLang();
const policy = getPrivacyPolicy(lang);

document.documentElement.lang = lang;
document.title = `${policy.title} · HireFlow`;

// Selector de idioma: enlaces normales (?lang=xx), funcionan sin JavaScript
// extra y se pueden compartir tal cual
const langNav = document.getElementById("privacy-lang");
langNav.setAttribute("aria-label", LANG_LABEL[lang] || "Language");
AVAILABLE.forEach((code) => {
    const link = node("a", LANG_NAMES[code]);
    link.href = `?lang=${code}`;
    link.hreflang = code;
    link.lang = code;
    if (code === lang) link.setAttribute("aria-current", "page");
    langNav.append(link);
});

const content = document.getElementById("privacy-content");
content.innerHTML = "";
content.append(
    node("h1", policy.title),
    node("p", policy.updated, "privacy-updated"),
    ...policy.sections.flatMap((section) => [node("h2", section.heading), node("p", section.body)]),
    node("p", policy.disclaimer, "privacy-disclaimer")
);
