import { registerRoute, initRouter, refresh } from "./router.js";
import { initHeader } from "./components/header.js";
import { el } from "./components/ui.js";
import { getLang, setLang, getLangName, onLangChange, SUPPORTED_LANGS } from "./i18n.js";
import { initMascot } from "./mascot.js";
import { lostMascot } from "./components/lostMascot.js";

import * as loginScreen from "./screens/login.js";
import * as homeScreen from "./screens/home.js";
import * as jobsScreen from "./screens/jobs.js";
import * as jobFormScreen from "./screens/jobForm.js";
import * as applicationsScreen from "./screens/applications.js";
import * as applicantsScreen from "./screens/applicants.js";
import * as profileFormScreen from "./screens/profileForm.js";
import * as calendarScreen from "./screens/calendar.js";
import * as aiScreen from "./screens/ai.js";

registerRoute("/login", { render: loginScreen.render, public: true });
registerRoute("/", { render: homeScreen.render });
registerRoute("/jobs", { render: jobsScreen.render });
registerRoute("/jobs/new", { render: jobFormScreen.render });
registerRoute("/jobs/edit/:id", { render: jobFormScreen.render });
registerRoute("/applications", { render: applicationsScreen.render });
registerRoute("/applicants", { render: applicantsScreen.render });
registerRoute("/profile", { render: profileFormScreen.render });
registerRoute("/calendar", { render: calendarScreen.render });
registerRoute("/ai", { render: aiScreen.render });
// El maletín buscando (ver components/lostMascot.js, decisions.md entrada 036)
registerRoute("/404", {
    render: (container) => container.append(lostMascot({ homeHref: "#/" })),
    public: true
});

const initLangSwitcher = () => {
    const select = document.getElementById("lang-switcher");

    select.innerHTML = "";
    SUPPORTED_LANGS.forEach((lang) => {
        // Solo las 2 iniciales en el option (botón más pequeño); el nombre
        // completo queda como title para quien pase el ratón por encima.
        select.append(el("option", { value: lang, title: getLangName(lang), text: lang.toUpperCase() }));
    });
    select.value = getLang();

    select.addEventListener("change", () => setLang(select.value));
};

document.documentElement.lang = getLang();
onLangChange((lang) => { document.documentElement.lang = lang; });

const mainContainer = document.querySelector(".main-container");
initLangSwitcher();
initHeader();
initRouter(mainContainer);
initMascot();

// Service worker: hace la app instalable y muestra "Sin conexión" si no hay
// red. No guarda en caché la app ni la API (ver sw.js y decisions.md, entrada 042).
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
        // Sin service worker la app funciona igual; solo no es instalable
    });
}

// Al cambiar de idioma, se vuelve a renderizar la pantalla actual sin
// perder la posición de navegación (no es un cambio de ruta).
onLangChange(() => refresh());
