import { el, emptyState } from "../components/ui.js";
import { getCurrentUser } from "../auth.js";

export const render = (container) => {
    const user = getCurrentUser();
    const message = user.role === "recruiter"
        ? "Bienvenido. Usa el menú para gestionar tus ofertas, ver tu calendario de entrevistas o pedir ayuda al asistente."
        : "Bienvenido. Usa el menú para buscar ofertas, revisar tus postulaciones o pedir ayuda al asistente.";

    container.append(el("div", {}, [emptyState(message)]));
};
