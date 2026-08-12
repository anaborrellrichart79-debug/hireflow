import { el, errorBanner, primaryButton, openDialog } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { t, getLang } from "../i18n.js";

const DAY_KEYS = ["calendar.mon", "calendar.tue", "calendar.wed", "calendar.thu", "calendar.fri", "calendar.sat"];

const formatDateTime = (isoLike) => {
    const date = new Date(isoLike.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return isoLike;
    return date.toLocaleString(getLang(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const dayIndex = (isoLike) => {
    const date = new Date(isoLike.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return null;
    return (date.getDay() + 6) % 7; // lunes = 0 ... domingo = 6
};

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
            onScheduled();
        } catch (error) {
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.append(errorBanner(detail || error.message));
        }
    });
};

export const render = async (container) => {
    const user = getCurrentUser();
    const isRecruiter = user.role === "recruiter";

    const errorSlot = el("div", {});
    const successSlot = el("div", {});
    const tableSlot = el("div", { class: "list-slot" }, [el("p", { text: t("common.loading") })]);
    container.append(errorSlot, successSlot, tableSlot);

    const draw = async () => {
        errorSlot.innerHTML = "";
        successSlot.innerHTML = "";
        tableSlot.innerHTML = "";

        let interviews;
        try {
            interviews = await apiFetch("/interviews");
        } catch (error) {
            errorSlot.append(errorBanner(error.message));
            return;
        }

        const byDay = DAY_KEYS.map(() => []);
        interviews.forEach((interview) => {
            const index = dayIndex(interview.scheduled_date);
            if (index !== null && index < 6) {
                byDay[index].push(interview);
            }
        });

        const onDeleteInterview = async (id) => {
            await apiFetch(`/interviews/${id}`, { method: "DELETE" });
            draw();
        };

        const table = el("div", { class: "week-calendar" },
            DAY_KEYS.map((dayKey, index) =>
                el("div", { class: "week-column" }, [
                    el("div", { class: "week-header", text: t(dayKey) }),
                    ...(byDay[index].length > 0
                        ? byDay[index]
                            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
                            .map((interview) => el("div", { class: "week-event" }, [
                                el("strong", { text: formatDateTime(interview.scheduled_date) }),
                                interview.location ? el("span", { text: interview.location }) : null,
                                isRecruiter && interview.candidate_name ? el("span", { class: "card-meta", text: `${t("calendar.candidateLabel")} ${interview.candidate_name}` }) : null,
                                isRecruiter && interview.job_title ? el("span", { class: "card-meta", text: `${t("calendar.jobLabel")} ${interview.job_title}` }) : null,
                                isRecruiter
                                    ? el("button", { type: "button", class: "secondary-button danger", text: t("calendar.deleteInterview"), onClick: () => onDeleteInterview(interview.id) })
                                    : null
                            ]))
                        : [el("div", { class: "week-empty", text: t("common.dash") })])
                ])
            )
        );

        tableSlot.append(table);
    };

    if (isRecruiter) {
        container.prepend(primaryButton(t("calendar.addInterviewButton"), async () => {
            errorSlot.innerHTML = "";
            try {
                const applications = await apiFetch("/applications/recruiter");
                // draw() limpia successSlot al empezar, así que el mensaje se
                // añade DESPUÉS de que termine de redibujar (mismo motivo que
                // en applicants.js) o desaparecería en el mismo instante.
                openAddInterviewDialog(applications, async () => {
                    await draw();
                    successSlot.append(el("p", { class: "success-text", text: t("calendar.interviewCreated") }));
                });
            } catch (error) {
                errorSlot.append(errorBanner(error.message));
            }
        }));
    }

    draw();
};
