// Lo común de las páginas públicas sin sesión (privacy.html,
// delete-account.html): idioma, selector de idioma y "Volver a HireFlow".
// Se publican solas en GitHub Pages, así que no dependen del resto de la app.
// Ver docs/decisions.md, entradas 035, 039 y 042.

const LANG_NAMES = { es: "Español", en: "English", fr: "Français", it: "Italiano" };
// Nombre accesible del selector de idioma, en el idioma de la página
const LANG_LABEL = { es: "Idioma", en: "Language", fr: "Langue", it: "Lingua" };
const BACK_LABEL = { es: "Volver a HireFlow", en: "Back to HireFlow", fr: "Retour à HireFlow", it: "Torna a HireFlow" };

export const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
};

// Idioma: ?lang= en la URL > el que eligió en la app > el del navegador > español
export const pickLang = (available) => {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (available.includes(fromUrl)) return fromUrl;
    try {
        const fromApp = localStorage.getItem("hireflow_lang");
        if (available.includes(fromApp)) return fromApp;
    } catch {
        // localStorage bloqueado: se sigue con el idioma del navegador
    }
    const fromBrowser = (navigator.language || "").slice(0, 2);
    return available.includes(fromBrowser) ? fromBrowser : "es";
};

// Pinta la cabecera (selector de idioma y "Volver a HireFlow") y devuelve
// appendBackButton(container) para añadir el botón de volver al final del
// texto. "Volver" solo aparece si la página se sirve junto a la app: la
// <meta name="hireflow-app"> no existe en la copia de GitHub Pages.
export const setupPublicPage = ({ lang, available, title }) => {
    document.documentElement.lang = lang;
    document.title = `${title} · HireFlow`;

    // Enlaces normales (?lang=xx): funcionan sin JavaScript extra y se pueden compartir
    const langNav = document.getElementById("privacy-lang");
    langNav.setAttribute("aria-label", LANG_LABEL[lang] || "Language");
    available.forEach((code) => {
        const link = node("a", LANG_NAMES[code]);
        link.href = `?lang=${code}`;
        link.hreflang = code;
        link.lang = code;
        if (code === lang) link.setAttribute("aria-current", "page");
        langNav.append(link);
    });

    const appUrl = document.querySelector('meta[name="hireflow-app"]')?.content;
    const backLink = (className, text) => {
        const link = node("a", text, className);
        link.href = appUrl;
        return link;
    };
    if (appUrl) {
        langNav.before(backLink("privacy-back", `← ${BACK_LABEL[lang]}`));
    }

    return {
        appendBackButton: (container) => {
            if (!appUrl) return;
            const wrapper = node("p", "", "privacy-back-bottom");
            wrapper.append(backLink("privacy-back-button", BACK_LABEL[lang]));
            container.append(wrapper);
        }
    };
};
