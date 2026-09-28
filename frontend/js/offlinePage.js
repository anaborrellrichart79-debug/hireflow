// Textos de la página "Sin conexión" (offline.html) en el idioma de la app.
// Sin depender de i18n.js: la página tiene que funcionar solo con lo que
// guarda el service worker. Ver docs/decisions.md, entrada 042.
const TEXTS = {
    es: { bubble: "¿Sin conexión?", title: "No hay conexión a internet", text: "Comprueba tu conexión y vuelve a intentarlo.", retry: "Reintentar" },
    en: { bubble: "Offline?", title: "No internet connection", text: "Check your connection and try again.", retry: "Try again" },
    fr: { bubble: "Hors ligne ?", title: "Pas de connexion internet", text: "Vérifiez votre connexion et réessayez.", retry: "Réessayer" },
    it: { bubble: "Offline?", title: "Nessuna connessione a internet", text: "Controlla la connessione e riprova.", retry: "Riprova" }
};

let lang = "es";
try {
    const stored = localStorage.getItem("hireflow_lang");
    if (TEXTS[stored]) lang = stored;
} catch {
    // Sin localStorage: español
}
const text = TEXTS[lang];

document.documentElement.lang = lang;
document.title = `${text.title} · HireFlow`;
document.getElementById("offline-bubble").textContent = text.bubble;
document.getElementById("offline-title").textContent = text.title;
document.getElementById("offline-text").textContent = text.text;
const retry = document.getElementById("offline-retry");
retry.textContent = text.retry;
retry.addEventListener("click", () => location.reload());
