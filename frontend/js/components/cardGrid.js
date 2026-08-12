import { el, emptyState } from "./ui.js";

// items: array de datos
// renderCard(item) => HTMLElement (el contenido interno de cada Card)
// emptyMessage: texto a mostrar si items está vacío
export const cardGrid = (items, renderCard, emptyMessage) => {
    if (!items || items.length === 0) {
        return emptyState(emptyMessage);
    }

    const grid = el("div", { class: "card-grid" });

    items.forEach((item) => {
        const card = el("div", { class: "card" }, [renderCard(item)]);
        grid.append(card);
    });

    return el("div", { class: "gradient-container" }, [grid]);
};
