// Página no encontrada (404): el maletín da tres vueltas buscando y, al
// terminar, dice "Creo que no lo encuentro…". Lo usan la ruta /404 de la app
// y la página estática 404.html (Express y GitHub Pages), así que no depende
// de nada más que de i18n.js. Ver docs/decisions.md, entrada 036.
import { t } from "../i18n.js";

const node = (tag, props = {}, children = []) => {
    const element = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
        if (key === "text") element.textContent = value;
        else if (key === "class") element.className = value;
        else element.setAttribute(key, value);
    });
    element.append(...children);
    return element;
};

// Si la animación no llega a ejecutarse (pestaña en segundo plano, CSS que no
// carga...), el bocadillo aparece igualmente pasado este tiempo.
const BUBBLE_FALLBACK_MS = 3200;

// headingLevel: 2 dentro de la app (el <h1> es el logo de la cabecera); 1 en
// la página estática 404.html, que no tiene otro encabezado principal.
export const lostMascot = ({ homeHref, headingLevel = 2 }) => {
    const bubble = node("p", { class: "lost-bubble", text: t("notFound.bubble") });
    const mascot = node("img", { class: "lost-mascot", src: "assets/mascota-soporte.svg", alt: "" });

    let shown = false;
    const showBubble = () => {
        if (shown) return;
        shown = true;
        bubble.classList.add("visible");
        mascot.classList.add("lost-mascot-done");
    };
    // Con movimiento reducido no hay vueltas: el bocadillo sale ya
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        showBubble();
    } else {
        mascot.addEventListener("animationend", showBubble, { once: true });
        setTimeout(showBubble, BUBBLE_FALLBACK_MS);
    }

    return node("section", { class: "lost", "aria-labelledby": "lost-title" }, [
        node("div", { class: "lost-stage" }, [bubble, mascot]),
        node("p", { class: "lost-code", "aria-hidden": "true", text: "404" }),
        node(`h${headingLevel}`, { id: "lost-title", class: "lost-title", text: t("notFound.title") }),
        node("p", { class: "lost-text", text: t("notFound.text") }),
        node("a", { class: "lost-home", href: homeHref, text: t("notFound.home") })
    ]);
};
