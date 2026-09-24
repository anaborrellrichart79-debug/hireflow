import { el, errorBanner, openDialog } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";
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
        onClick: () => {
            expanded = !expanded;
            toggleButton.textContent = expanded ? t("applicants.hideProfile") : t("applicants.viewProfile");
            renderDetails();
        }
    });

    // Si una postulación antigua sigue en "wishlist", se muestra también esa
    // opción para que el desplegable refleje su estado real.
    const statusOptions = RECRUITER_STATUS_OPTIONS.includes(application.status)
        ? RECRUITER_STATUS_OPTIONS
        : [application.status, ...RECRUITER_STATUS_OPTIONS];

    const statusSelect = el("select", {
        "aria-label": t("applicants.statusLabel"),
        onChange: (event) => onStatusChange(application.id, event.target.value)
    }, statusOptions.map((status) =>
        el("option", { value: status, selected: status === application.status ? "true" : undefined, text: statusLabel(status) })
    ));

    return el("div", { class: "card-content" }, [
        el("h3", { text: application.candidate_name }),
        el("p", { class: "card-meta", text: `${t("applicants.jobLabel")} ${application.job_title}` }),
        el("span", { class: "status-badge", text: statusLabel(application.status) }),
        statusSelect,
        detailsSlot,
        el("div", { class: "card-actions" }, [
            toggleButton,
            el("button", { type: "button", class: "secondary-button", text: t("applicants.scheduleInterview"), onClick: () => onScheduleInterview(application) })
        ])
    ]);
};

export const render = async (container) => {
    const errorSlot = el("div", {});
    const successSlot = el("div", {});
    container.append(errorSlot, successSlot);

    const listSlot = el("div", { class: "list-slot" }, [el("p", { text: t("common.loading") })]);
    container.append(listSlot);

    // draw() limpia successSlot al empezar -- por eso el mensaje de éxito se
    // añade DESPUÉS de que el redibujado (draw) termine, nunca antes ni en
    // paralelo, o desaparecería en el mismo instante en que se muestra.
    const draw = async () => {
        listSlot.innerHTML = "";
        successSlot.innerHTML = "";
        try {
            const applications = await apiFetch("/applications/recruiter");

            const onStatusChange = async (id, status) => {
                errorSlot.innerHTML = "";
                try {
                    await apiFetch(`/applications/${id}/status`, { method: "PUT", body: { status } });
                    await draw();
                    successSlot.append(el("p", { class: "success-text", text: t("applicants.statusUpdateSuccess") }));
                } catch (error) {
                    errorSlot.append(errorBanner(error.message));
                }
            };

            // Agendar la entrevista cambia el estado a "En entrevista" en el
            // backend, así que se redibuja la lista antes de mostrar el aviso
            // (después, no antes: draw() vacía successSlot).
            const onScheduleInterview = (application) => {
                openScheduleInterviewDialog(application, async () => {
                    await draw();
                    successSlot.append(el("p", { class: "success-text", text: t("calendar.interviewCreated") }));
                });
            };

            listSlot.append(cardGrid(applications, (application) => applicantCard(application, onStatusChange, onScheduleInterview), t("applicants.empty")));
        } catch (error) {
            listSlot.innerHTML = "";
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
