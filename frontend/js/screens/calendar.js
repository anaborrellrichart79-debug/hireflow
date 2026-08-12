import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const formatDateTime = (isoLike) => {
    const date = new Date(isoLike.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return isoLike;
    return date.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const dayIndex = (isoLike) => {
    const date = new Date(isoLike.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return null;
    return (date.getDay() + 6) % 7; // lunes = 0 ... domingo = 6
};

export const render = async (container) => {
    container.append(el("p", { text: "Cargando..." }));

    let interviews;
    try {
        interviews = await apiFetch("/interviews");
    } catch (error) {
        container.innerHTML = "";
        container.append(errorBanner(error.message));
        return;
    }

    container.innerHTML = "";

    const byDay = DAYS.slice(0, 6).map(() => []);
    interviews.forEach((interview) => {
        const index = dayIndex(interview.scheduled_date);
        if (index !== null && index < 6) {
            byDay[index].push(interview);
        }
    });

    const table = el("div", { class: "week-calendar" },
        DAYS.slice(0, 6).map((day, index) =>
            el("div", { class: "week-column" }, [
                el("div", { class: "week-header", text: day }),
                ...(byDay[index].length > 0
                    ? byDay[index]
                        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                        .map((interview) => el("div", { class: "week-event" }, [
                            el("strong", { text: formatDateTime(interview.scheduled_date) }),
                            interview.location ? el("span", { text: interview.location }) : null
                        ]))
                    : [el("div", { class: "week-empty", text: "—" })])
            ])
        )
    );

    container.append(table);
};
