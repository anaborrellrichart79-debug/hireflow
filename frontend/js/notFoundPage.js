// Página estática 404.html: la sirve Express para URLs que no existen fuera
// de /api y GitHub Pages para cualquier ruta desconocida. Ver
// docs/decisions.md, entrada 036.
import { t, getLang } from "./i18n.js";
import { lostMascot } from "./components/lostMascot.js";

document.documentElement.lang = getLang();
document.title = `${t("notFound.title")} · HireFlow`;

const root = document.getElementById("lost-root");
root.innerHTML = "";
// "./" respeta el <base>: la app en local, la Política de Privacidad en Pages
root.append(lostMascot({ homeHref: "./", headingLevel: 1 }));
