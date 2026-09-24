import { el, errorBanner, openDialog, emptyState, linkLabels } from "../components/ui.js";
import { kanbanBoard } from "../components/kanban.js";
import { apiFetch } from "../api.js";
import { t, getLang } from "../i18n.js";
import { RECRUITER_STATUS_OPTIONS, statusLabel } from "../applicationStatus.js";

// Pantalla de la empresa: quién se ha postulado a sus ofertas, con opción de
// ver los datos de contacto (solo si el candidato dio su consentimiento al
// postularse -- consent_share_contact, ver decisions.md entrada 017), cambiar
// el estado (avisa al candidato, ver applicationStatus/home.js) y agendar una
// entrevista directamente sobre esa postulación.
const openScheduleInterviewDialog = (application, onScheduled) => {
    const errorSlot = el("div", {});
    const dateInput = el("input", { type: "datetime-local" });
    const locationInput = el("input", { type: "text", placeholder: t("calendar.locationLabel") });
    const notesInput = el("textarea", { rows: "3" });

    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("calendar.cancelInterview") });
    const submitButton = el("button", { type: "button", class: "primary-button", text: t("calendar.submitInterview") });

    const dialog = openDialog([
        el("h2", { id: "interview-dialog-title", text: t("calendar.addInterviewButton") }),
        errorSlot,
        el("p", { text: `${t("calendar.candidateLabel")} ${application.candidate_name}` }),
        el("p", { text: `${t("calendar.jobLabel")} ${application.job_title}` }),
        el("label", { text: t("calendar.dateLabel") }),
        dateInput,
        el("label", { text: t("calendar.locationLabel") }),
        locationInput,
        el("label", { text: t("calendar.notesLabel") }),
        notesInput,
        el("div", { class: "hf-dialog-actions" }, [cancelButton, submitButton])
    ], { labelledBy: "interview-dialog-title" });

    cancelButton.addEventListener("click", () => dialog.close());

    submitButton.addEventListener("click", async () => {
        errorSlot.innerHTML = "";
        try {
            // <input type="datetime-local"> da "YYYY-MM-DDTHH:mm" -- el backend
            // acepta esa "T" (ver interviewValidators.js, DATETIME_REGEX).
            await apiFetch("/interviews", {
                method: "POST",
                body: {
                    application_id: application.id,
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

const formatShortDate = (value) => {
    if (!value) return null;
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(getLang(), { day: "numeric", month: "short" });
};

const applicantCard = (application, onStatusChange, onScheduleInterview) => {
    const detailsSlot = el("div", {});
    let expanded = false;

    const renderDetails = () => {
        detailsSlot.innerHTML = "";
        if (!expanded) return;

        if (!application.consent_share_contact) {
            detailsSlot.append(el("p", { class: "form-note", text: t("applicants.noContactConsent") }));
            return;
        }

        detailsSlot.append(
            el("p", { text: `${t("applicants.contactEmail")} ${application.candidate_email || t("common.dash")}` }),
            el("p", { text: `${t("applicants.contactPhone")} ${application.candidate_phone || t("common.dash")}` }),
            el("p", { text: `${t("applicants.sectorLabel")} ${application.candidate_sector || t("common.dash")}` }),
            el("p", { text: `${t("applicants.locationLabel")} ${application.candidate_location || t("common.dash")}` }),
            application.signature_name ? el("p", { class: "form-note", text: `${t("applicants.signedLabel")} ${application.signature_name}` }) : null
        );
    };

    const toggleButton = el("button", {
        type: "button",
        class: "secondary-button",
        text: t("applicants.viewProfile"),
        "aria-expanded": "false",
        onClick: () => {
            expanded = !expanded;
            toggleButton.textContent = expanded ? t("applicants.hideProfile") : t("applicants.viewProfile");
            toggleButton.setAttribute("aria-expanded", String(expanded));
            renderDetails();
        }
    });

    // Si una postulación antigua sigue en "wishlist", se muestra también esa
    // opción para que el desplegable refleje su estado real.
    const statusOptions = RECRUITER_STATUS_OPTIONS.includes(application.status)
        ? RECRUITER_STATUS_OPTIONS
        : [application.status, ...RECRUITER_STATUS_OPTIONS];

    // Alternativa a arrastrar la tarjeta: funciona con teclado y en móvil,
    // donde el arrastre de HTML5 no existe (ver kanban.js).
    const statusSelect = el("select", {
        class: "kanban-status-select",
        "aria-label": `${t("applicants.statusLabel")}: ${application.candidate_name}`,
        onChange: (event) => onStatusChange(application.id, event.target.value)
    }, statusOptions.map((status) =>
        el("option", { value: status, selected: status === application.status ? "true" : undefined, text: statusLabel(status) })
    ));

    const appliedOn = formatShortDate(application.applied_date || application.created_at);

    return el("div", { class: "card-content applicant-card" }, [
        el("h4", { class: "kanban-card-title", text: application.candidate_name }),
        el("p", { class: "card-meta", text: `${t("applicants.jobLabel")} ${application.job_title}` }),
        appliedOn ? el("p", { class: "kanban-card-date", text: `${t("applicants.appliedOn")} ${appliedOn}` }) : null,
        statusSelect,
        detailsSlot,
        el("div", { class: "card-actions" }, [
            toggleButton,
            el("button", { type: "button", class: "secondary-button", text: t("applicants.scheduleInterview"), onClick: () => onScheduleInterview(application) })
        ])
    ]);
};

// Filtro por oferta. Se puede fijar desde fuera antes de navegar aquí (el
// recuento de postulantes de cada oferta en jobs.js lleva con su oferta ya
// filtrada); vive fuera de render() para no perderse al redibujar.
let jobFilter = "";
export const setApplicantsJobFilter = (jobOfferId) => {
    jobFilter = jobOfferId ? String(jobOfferId) : "";
};

export const render = async (container) => {
    const errorSlot = el("div", {});
    const successSlot = el("div", { "aria-live": "polite" });
    container.append(errorSlot, successSlot);

    const listSlot = el("div", { class: "kanban-screen" }, [el("p", { text: t("common.loading") })]);
    container.append(listSlot);

    const showSuccess = (text) => {
        successSlot.innerHTML = "";
        successSlot.append(el("p", { class: "success-text", text }));
    };

    // draw() limpia successSlot al empezar -- por eso el mensaje de éxito se
    // añade DESPUÉS de que el redibujado (draw) termine, nunca antes ni en
    // paralelo, o desaparecería en el mismo instante en que se muestra.
    const draw = async () => {
        listSlot.innerHTML = "";
        successSlot.innerHTML = "";
        try {
            const applications = await apiFetch("/applications/recruiter");

            if (applications.length === 0) {
                listSlot.append(emptyState(t("applicants.empty")));
                return;
            }

            const onStatusChange = async (id, status) => {
                errorSlot.innerHTML = "";
                try {
                    await apiFetch(`/applications/${id}/status`, { method: "PUT", body: { status } });
                    await draw();
                    showSuccess(t("applicants.statusUpdateSuccess"));
                } catch (error) {
                    errorSlot.append(errorBanner(error.message));
                }
            };

            // Agendar la entrevista cambia el estado a "En entrevista" en el
            // backend, así que se redibuja el tablero antes de mostrar el aviso
            // (después, no antes: draw() vacía successSlot).
            const onScheduleInterview = (application) => {
                openScheduleInterviewDialog(application, async () => {
                    await draw();
                    showSuccess(t("calendar.interviewCreated"));
                });
            };

            // Arrastrar una tarjeta a otra columna: kanban.js la mueve al
            // momento; si el servidor falla, lanza y la tarjeta vuelve.
            const onMove = async (application, status) => {
                errorSlot.innerHTML = "";
                try {
                    await apiFetch(`/applications/${application.id}/status`, { method: "PUT", body: { status } });
                } catch (error) {
                    errorSlot.append(errorBanner(error.message));
                    throw error;
                }
                application.status = status;
                const select = listSlot.querySelector(`[data-application-id="${application.id}"] select`);
                if (select) select.value = status;
                showSuccess(t("applicants.statusUpdateSuccess"));
            };

            // Filtro por oferta
            const offers = [...new Map(applications.map((app) => [String(app.job_offer_id), app.job_title])).entries()];
            if (jobFilter && !offers.some(([id]) => id === jobFilter)) jobFilter = "";
            const offerSelect = el("select", { class: "kanban-filter", "aria-label": t("applicants.filterByOffer") }, [
                el("option", { value: "", text: t("applicants.allOffers") }),
                ...offers.map(([id, title]) => el("option", { value: id, selected: id === jobFilter ? "true" : undefined, text: title }))
            ]);
            offerSelect.addEventListener("change", () => { jobFilter = offerSelect.value; drawBoard(); });

            const boardSlot = el("div", {});
            const drawBoard = () => {
                const visible = applications.filter((app) => !jobFilter || String(app.job_offer_id) === jobFilter);
                // Columna "Interesa" solo si queda alguna postulación antigua en ese estado.
                const statuses = visible.some((app) => app.status === "wishlist")
                    ? ["wishlist", ...RECRUITER_STATUS_OPTIONS]
                    : RECRUITER_STATUS_OPTIONS;
                boardSlot.innerHTML = "";
                boardSlot.append(kanbanBoard({
                    columns: statuses.map((status) => ({ status, label: statusLabel(status) })),
                    items: visible,
                    getStatus: (app) => app.status,
                    renderCard: (app) => {
                        const card = applicantCard(app, onStatusChange, onScheduleInterview);
                        card.dataset.applicationId = app.id;
                        return card;
                    },
                    onMove,
                    emptyColumnText: t("applicants.emptyColumn")
                }));
                linkLabels(boardSlot);
            };

            listSlot.append(
                el("div", { class: "kanban-toolbar" }, [
                    offerSelect,
                    el("p", { class: "form-note kanban-hint", text: t("applicants.dragHint") })
                ]),
                boardSlot
            );
            drawBoard();
        } catch (error) {
            listSlot.innerHTML = "";
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
