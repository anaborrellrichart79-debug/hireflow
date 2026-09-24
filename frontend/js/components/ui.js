// Helper mínimo para crear elementos sin plantillas de string (evita
// problemas de escapado/XSS al insertar datos del usuario o de la API).
export const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);

    Object.entries(props).forEach(([key, value]) => {
        if (key === "class") {
            node.className = value;
        } else if (key === "text") {
            node.textContent = value;
        } else if (key.startsWith("on") && typeof value === "function") {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value !== undefined && value !== null) {
            node.setAttribute(key, value);
        }
    });

    (Array.isArray(children) ? children : [children]).forEach((child) => {
        if (child === undefined || child === null) return;
        node.append(typeof child === "string" ? document.createTextNode(child) : child);
    });

    return node;
};

// Accesibilidad: muchos formularios y diálogos ponen un <label> justo antes de
// su campo sin relacionarlos, así que un lector de pantalla no anunciaba el
// nombre del campo. Esto los asocia (for/id) y, a los campos que solo tienen
// placeholder, les da ese texto como nombre accesible. Se llama tras pintar
// cada pantalla (router.js) y al abrir un diálogo. Ver decisions.md, entrada 029.
let autoIdCounter = 0;
export const linkLabels = (root) => {
    root.querySelectorAll("label:not([for])").forEach((label) => {
        if (label.querySelector("input, select, textarea")) return; // ya lo envuelve
        const control = label.nextElementSibling;
        if (!control || !control.matches("input, select, textarea")) return;
        if (!control.id) control.id = `hf-field-${++autoIdCounter}`;
        label.htmlFor = control.id;
    });
    root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((control) => {
        const hasLabel = control.labels && control.labels.length > 0;
        if (!hasLabel && !control.hasAttribute("aria-label")) {
            control.setAttribute("aria-label", control.placeholder);
        }
    });
};

export const emptyState = (message) =>
    el("div", { class: "empty-state" }, [
        el("p", { class: "empty-state-text", text: message })
    ]);

export const errorBanner = (message) =>
    el("div", { class: "error-banner", text: message });

export const infoBanner = (message) =>
    el("div", { class: "info-banner", role: "status", text: message });

export const primaryButton = (text, onClick) =>
    el("button", { class: "primary-button", type: "button", onClick, text });

// Modal reutilizable sobre el elemento <dialog> nativo: da backdrop, foco
// atrapado y cierre con Escape gratis, sin depender de ninguna librería.
// contentNodes puede incluir su propio botón de cierre (llamando a dialog.close()),
// pero también se añade uno de cierre accesible en la esquina por si no lo trae.
export const openDialog = (contentNodes, { labelledBy } = {}) => {
    const dialog = el("dialog", { class: "hf-dialog" }, [
        el("div", { class: "hf-dialog-content" }, contentNodes)
    ]);

    if (labelledBy) {
        dialog.setAttribute("aria-labelledby", labelledBy);
    }

    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    linkLabels(dialog);
    dialog.showModal();

    return dialog;
};
