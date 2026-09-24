import { el, errorBanner, primaryButton, openDialog } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { t, getLang } from "../i18n.js";

// Las fechas llegan del backend como ISO ("2026-09-24T08:00:00.000Z") o como
// "YYYY-MM-DD HH:mm:ss"; se aceptan las dos.
const parseDate = (value) => new Date(String(value).replace(" ", "T"));

// Lunes 00:00 (hora local) de la semana que contiene `date`.
const startOfWeek = (date) => {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Nombres de días y fechas con Intl en el idioma activo, en vez de claves
// de traducción fijas: así salen bien en los 4 idiomas sin mantenerlas.
const formatTime = (date) => date.toLocaleTimeString(getLang(), { hour: "2-digit", minute: "2-digit" });
const formatDayName = (date) => date.toLocaleDateString(getLang(), { weekday: "long" });
const formatDayNumber = (date) => date.toLocaleDateString(getLang(), { day: "numeric", month: "short" });
const formatLongDate = (date) => date.toLocaleDateString(getLang(), { weekday: "long", day: "numeric", month: "long" });

const formatWeekRange = (monday) => {
    const sunday = addDays(monday, 6);
    const options = { day: "numeric", month: "short", year: "numeric" };
    const formatter = new Intl.DateTimeFormat(getLang(), options);
    return typeof formatter.formatRange === "function"
        ? formatter.formatRange(monday, sunday)
        : `${formatter.format(monday)} – ${formatter.format(sunday)}`;
};

// Semana visible. Vive fuera de render() para que no se pierda al redibujar
// la pantalla (por ejemplo, al cambiar de idioma) mientras dure la sesión.
let visibleWeekStart = null;

// Solo la empresa agenda entrevistas (pedido explícito del usuario); el
// candidato solo las visualiza. Se elige entre sus propios postulantes
// (GET /applications/recruiter) para no tener que teclear un application_id.
const openAddInterviewDialog = (applications, onScheduled) => {
    const errorSlot = el("div", {});

    if (applications.length === 0) {
        openDialog([
            el("h2", { id: "add-interview-title", text: t("calendar.addInterviewButton") }),
            el("p", { text: t("calendar.noApplicantsForInterview") })
        ], { labelledBy: "add-interview-title" });
        return;
    }

    const applicantSelect = el("select", {}, [
        el("option", { value: "", text: t("calendar.selectApplicantPlaceholder") }),
        ...applications.map((app) => el("option", { value: app.id, text: `${app.candidate_name} — ${app.job_title}` }))
    ]);
    const dateInput = el("input", { type: "datetime-local" });
    const locationInput = el("input", { type: "text", placeholder: t("calendar.locationLabel") });
    const notesInput = el("textarea", { rows: "3" });

    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("calendar.cancelInterview") });
    const submitButton = el("button", { type: "button", class: "primary-button", text: t("calendar.submitInterview") });

    const dialog = openDialog([
        el("h2", { id: "add-interview-title", text: t("calendar.addInterviewButton") }),
        errorSlot,
        el("label", { text: t("calendar.selectApplicantLabel") }),
        applicantSelect,
        el("label", { text: t("calendar.dateLabel") }),
        dateInput,
        el("label", { text: t("calendar.locationLabel") }),
        locationInput,
        el("label", { text: t("calendar.notesLabel") }),
        notesInput,
        el("div", { class: "hf-dialog-actions" }, [cancelButton, submitButton])
    ], { labelledBy: "add-interview-title" });

    cancelButton.addEventListener("click", () => dialog.close());

    submitButton.addEventListener("click", async () => {
        errorSlot.innerHTML = "";
        try {
            await apiFetch("/interviews", {
                method: "POST",
                body: {
                    application_id: Number(applicantSelect.value),
                    scheduled_date: dateInput.value,
                    location: locationInput.value || null,
                    notes: notesInput.value || null
                }
            });
            dialog.close();
            onScheduled(parseDate(dateInput.value));
        } catch (error) {
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.append(errorBanner(detail || error.message));
        }
    });
};

// Confirmación propia antes de borrar (el candidato la tiene en su calendario).
const openDeleteInterviewDialog = (interview, onConfirm) => {
    const errorSlot = el("div", {});
    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("calendar.cancelInterview") });
    const confirmButton = el("button", { type: "button", class: "primary-button", text: t("calendar.deleteConfirm") });
    const when = parseDate(interview.scheduled_date);

    const dialog = openDialog([
        el("h2", { id: "delete-interview-title", text: t("calendar.deleteTitle") }),
        errorSlot,
        el("p", { text: `${formatLongDate(when)}, ${formatTime(when)}${interview.candidate_name ? ` · ${interview.candidate_name}` : ""}` }),
        el("p", { class: "form-note", text: t("calendar.deleteText") }),
        el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
    ], { labelledBy: "delete-interview-title" });

    cancelButton.addEventListener("click", () => dialog.close());
    confirmButton.addEventListener("click", async () => {
        errorSlot.innerHTML = "";
        try {
            await onConfirm();
            dialog.close();
        } catch (error) {
            errorSlot.append(errorBanner(error.message));
        }
    });
};

const interviewCard = (interview, isRecruiter, onDelete) => {
    const when = parseDate(interview.scheduled_date);
    const jobLine = [interview.job_title, interview.company_name].filter(Boolean).join(" · ");

    return el("div", { class: "week-event" }, [
        el("strong", { class: "week-event-time", text: formatTime(when) }),
        isRecruiter && interview.candidate_name ? el("span", { class: "week-event-title", text: interview.candidate_name }) : null,
        jobLine ? el("span", { class: isRecruiter ? "card-meta" : "week-event-title", text: jobLine }) : null,
        interview.location ? el("span", { class: "card-meta", text: interview.location }) : null,
        isRecruiter
            ? el("button", { type: "button", class: "secondary-button danger week-event-delete", text: t("calendar.deleteInterview"), onClick: () => onDelete(interview) })
            : null
    ]);
};

export const render = async (container) => {
    const user = getCurrentUser();
    const isRecruiter = user.role === "recruiter";

    if (!visibleWeekStart) {
        visibleWeekStart = startOfWeek(new Date());
    }

    const errorSlot = el("div", {});
    const successSlot = el("div", {});
    const weekTitle = el("h2", { class: "week-title" });
    const toolbar = el("div", { class: "week-toolbar" }, [
        el("button", { type: "button", class: "secondary-button", "aria-label": t("calendar.prevWeek"), title: t("calendar.prevWeek"), text: "‹", onClick: () => goToWeek(addDays(visibleWeekStart, -7)) }),
        el("button", { type: "button", class: "secondary-button", text: t("calendar.today"), onClick: () => goToWeek(new Date()) }),
        el("button", { type: "button", class: "secondary-button", "aria-label": t("calendar.nextWeek"), title: t("calendar.nextWeek"), text: "›", onClick: () => goToWeek(addDays(visibleWeekStart, 7)) }),
        weekTitle
    ]);
    const tableSlot = el("div", {}, [el("p", { text: t("common.loading") })]);
    // Contenedor propio, más ancho que .list-slot (720px): 7 columnas lo necesitan.
    const screen = el("div", { class: "calendar-screen" }, [errorSlot, successSlot, toolbar, tableSlot]);
    container.append(screen);

    let interviews = [];

    const drawWeek = () => {
        tableSlot.innerHTML = "";
        weekTitle.textContent = formatWeekRange(visibleWeekStart);

        const weekEnd = addDays(visibleWeekStart, 7);
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, index) => addDays(visibleWeekStart, index));
        const inWeek = interviews
            .map((interview) => ({ interview, when: parseDate(interview.scheduled_date) }))
            .filter(({ when }) => when >= visibleWeekStart && when < weekEnd)
            .sort((a, b) => a.when - b.when);

        const onDelete = (interview) => openDeleteInterviewDialog(interview, async () => {
            await apiFetch(`/interviews/${interview.id}`, { method: "DELETE" });
            await load();
        });

        const table = el("div", { class: "week-calendar" }, days.map((day) => {
            const dayInterviews = inWeek.filter(({ when }) => sameDay(when, day));
            const classes = ["week-column"];
            if (sameDay(day, today)) classes.push("week-column--today");
            if (dayInterviews.length === 0) classes.push("week-column--empty");

            return el("div", { class: classes.join(" ") }, [
                el("div", { class: "week-header" }, [
                    el("span", { class: "week-header-day", text: formatDayName(day) }),
                    el("span", { class: "week-header-date", text: formatDayNumber(day) })
                ]),
                ...(dayInterviews.length > 0
                    ? dayInterviews.map(({ interview }) => interviewCard(interview, isRecruiter, onDelete))
                    : [el("div", { class: "week-empty", text: t("common.dash") })])
            ]);
        }));

        tableSlot.append(table);

        // Semana vacía: se dice y, si hay alguna entrevista más adelante, se
        // ofrece saltar a su semana en vez de obligar a ir pulsando "›".
        if (inWeek.length === 0) {
            const next = interviews
                .map((interview) => parseDate(interview.scheduled_date))
                .filter((when) => when >= weekEnd)
                .sort((a, b) => a - b)[0];

            tableSlot.prepend(el("div", { class: "week-empty-message" }, [
                el("p", { text: t("calendar.emptyWeek") }),
                next
                    ? el("button", { type: "button", class: "secondary-button", text: `${t("calendar.goToNext")} ${formatLongDate(next)}`, onClick: () => goToWeek(next) })
                    : null
            ]));
        }
    };

    const goToWeek = (date) => {
        visibleWeekStart = startOfWeek(date);
        successSlot.innerHTML = "";
        drawWeek();
    };

    const load = async () => {
        errorSlot.innerHTML = "";
        try {
            interviews = await apiFetch("/interviews");
        } catch (error) {
            tableSlot.innerHTML = "";
            errorSlot.append(errorBanner(error.message));
            return;
        }
        drawWeek();
    };

    if (isRecruiter) {
        screen.prepend(primaryButton(t("calendar.addInterviewButton"), async () => {
            errorSlot.innerHTML = "";
            try {
                const applications = await apiFetch("/applications/recruiter");
                // Tras agendar se salta a la semana de la entrevista nueva y
                // solo entonces se muestra el aviso (goToWeek vacía successSlot).
                openAddInterviewDialog(applications, async (scheduledDate) => {
                    await load();
                    if (!Number.isNaN(scheduledDate.getTime())) goToWeek(scheduledDate);
                    successSlot.append(el("p", { class: "success-text", text: t("calendar.interviewCreated") }));
                });
            } catch (error) {
                errorSlot.append(errorBanner(error.message));
            }
        }));
    }

    await load();
};
