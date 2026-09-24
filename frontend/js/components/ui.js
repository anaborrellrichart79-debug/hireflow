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
    dialog.showModal();

    return dialog;
};
