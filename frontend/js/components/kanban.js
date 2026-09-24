import { el } from "./ui.js";

// Tablero Kanban reutilizable (Postulantes y Mis postulaciones). Ver
// docs/decisions.md, entrada 031.
//
// columns:    [{ status, label }] en orden
// items:      datos a repartir en columnas según getStatus(item)
// renderCard: (item) => HTMLElement con el contenido de la tarjeta
// onMove:     (item, newStatus) => Promise. Si se pasa, las tarjetas se
//             pueden arrastrar entre columnas; si no, el tablero es de solo
//             lectura. El movimiento se pinta al momento y, si onMove
//             falla, la tarjeta vuelve a su columna.
//
// Arrastrar no funciona con teclado ni con el dedo (HTML5 drag and drop no
// existe en pantallas táctiles), así que quien usa el tablero debe ofrecer
// además otra forma de cambiar el estado dentro de la tarjeta (un <select>).
export const kanbanBoard = ({ columns, items, getStatus, renderCard, onMove, emptyColumnText }) => {
    const board = el("div", { class: "kanban-board" });
    const bodies = new Map();
    const counters = new Map();

    const updateCounts = () => {
        bodies.forEach((body, status) => {
            const count = body.querySelectorAll(".kanban-card").length;
            counters.get(status).textContent = String(count);
            body.querySelector(".kanban-empty")?.remove();
            if (count === 0) body.append(el("p", { class: "kanban-empty", text: emptyColumnText }));
        });
    };

    const makeCard = (item) => {
        const card = el("div", { class: "kanban-card" }, [renderCard(item)]);
        if (onMove) {
            card.draggable = true;
            card.classList.add("kanban-card--draggable");
            card.addEventListener("dragstart", (event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", "");
                board.dataset.dragging = "";
                card.classList.add("kanban-card--dragging");
                board._dragged = { item, card };
            });
            card.addEventListener("dragend", () => {
                card.classList.remove("kanban-card--dragging");
                delete board.dataset.dragging;
                board.querySelectorAll(".kanban-column--over").forEach((c) => c.classList.remove("kanban-column--over"));
            });
        }
        return card;
    };

    columns.forEach(({ status, label }) => {
        const counter = el("span", { class: "kanban-count" });
        const body = el("div", { class: "kanban-column-body" });
        const column = el("section", { class: `kanban-column kanban-column--${status}`, "aria-label": label }, [
            el("h3", { class: "kanban-column-title" }, [el("span", { text: label }), counter]),
            body
        ]);
        bodies.set(status, body);
        counters.set(status, counter);

        if (onMove) {
            column.addEventListener("dragover", (event) => {
                if (!board._dragged) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                column.classList.add("kanban-column--over");
            });
            column.addEventListener("dragleave", (event) => {
                if (!column.contains(event.relatedTarget)) column.classList.remove("kanban-column--over");
            });
            column.addEventListener("drop", async (event) => {
                event.preventDefault();
                column.classList.remove("kanban-column--over");
                const dragged = board._dragged;
                board._dragged = null;
                if (!dragged || getStatus(dragged.item) === status) return;

                const previousBody = dragged.card.parentElement;
                body.prepend(dragged.card);
                updateCounts();
                try {
                    await onMove(dragged.item, status);
                } catch {
                    previousBody.prepend(dragged.card);
                    updateCounts();
                }
            });
        }

        board.append(column);
    });

    items.forEach((item) => {
        const body = bodies.get(getStatus(item));
        if (body) body.append(makeCard(item));
    });
    updateCounts();

    return el("div", { class: "kanban-scroll" }, [board]);
};
