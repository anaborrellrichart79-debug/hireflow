import { el, errorBanner, openDialog } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";
import { STATUS_OPTIONS, statusLabel } from "../applicationStatus.js";

// Confirmación propia (no el confirm() nativo) antes de retirar: se borra la
// postulación y, con ella, el consentimiento y las entrevistas programadas.
const openWithdrawDialog = (onConfirm) => {
    const errorSlot = el("div", {});
    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("applications.withdrawCancel") });
    const confirmButton = el("button", { type: "button", class: "primary-button", text: t("applications.withdrawConfirm") });

    const dialog = openDialog([
        el("h2", { id: "withdraw-dialog-title", text: t("applications.withdrawTitle") }),
        errorSlot,
        el("p", { text: t("applications.withdrawText") }),
        el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
    ], { labelledBy: "withdraw-dialog-title" });

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

const statusCard = (app, jobTitle, onStatusChange, onWithdraw) => {
    // En una postulación a una oferta de HireFlow el estado lo mueve la
    // empresa: el candidato lo ve y puede retirarla. Solo los seguimientos
    // personales (sin oferta) conservan el desplegable. Ver decisions.md, entrada 023.
    const controls = app.job_offer_id
        ? [
            el("button", { class: "secondary-button danger", type: "button", text: t("applications.withdrawButton"), onClick: () => onWithdraw(app.id) })
        ]
        : [
            el("select", {
                "aria-label": t("applications.viewStatus"),
                onChange: (event) => onStatusChange(app.id, event.target.value)
            }, STATUS_OPTIONS.map((status) =>
                el("option", { value: status, selected: status === app.status ? "true" : undefined, text: statusLabel(status) })
            ))
        ];

    // wasUnseen se calcula ANTES de llamar a mark-seen (ver render()), así
    // que aquí sigue reflejando si la empresa cambió el estado desde la
    // última vez que el candidato abrió esta pantalla -- es el aviso en sí.
    const updateBadge = app.wasUnseen && app.status_updated_by === "recruiter"
        ? el("span", { class: "status-badge", text: t("applications.recentlyUpdated") })
        : null;

    return el("div", { class: "card-content" }, [
        el("h3", { text: jobTitle }),
        el("span", { class: "status-badge", text: statusLabel(app.status) }),
        updateBadge,
        ...controls
    ]);
};

const notesCard = (app, jobTitle, onNotesSave) => {
    const textarea = el("textarea", { rows: "3", text: app.notes || "" });

    return el("div", { class: "card-content" }, [
        el("h3", { text: jobTitle }),
        textarea,
        el("button", {
            class: "secondary-button",
            type: "button",
            text: t("applications.saveNote"),
            onClick: () => onNotesSave(app.id, textarea.value)
        })
    ]);
};

export const render = async (container) => {
    let mode = "estado";

    const toggle = el("div", { class: "toggle-group" }, [
        el("button", { class: "secondary-button", type: "button", text: t("applications.viewStatus"), onClick: () => { mode = "estado"; draw(); } }),
        el("button", { class: "secondary-button", type: "button", text: t("applications.viewNotes"), onClick: () => { mode = "notas"; draw(); } })
    ]);

    const listSlot = el("div", { class: "list-slot" });
    container.append(toggle, listSlot);

    const draw = async () => {
        listSlot.innerHTML = "";
        listSlot.append(el("p", { text: t("common.loading") }));

        try {
            const applications = await apiFetch("/applications");
            applications.forEach((app) => { app.wasUnseen = !app.status_seen_by_candidate; });

            // Efecto secundario intencional: abrir esta pantalla es la señal de
            // que el candidato ha visto los cambios de estado pendientes (ver
            // home.js, que muestra el contador mientras no se llame a esto).
            // No se espera ni bloquea el render -- si falla, simplemente el
            // aviso seguirá apareciendo en Home la próxima vez.
            apiFetch("/applications/mark-seen", { method: "PUT" }).catch(() => {});

            const jobTitles = {};
            await Promise.all(
                [...new Set(applications.map((a) => a.job_offer_id).filter(Boolean))].map(async (jobOfferId) => {
                    try {
                        const job = await apiFetch(`/jobs/${jobOfferId}`);
                        jobTitles[jobOfferId] = job.title;
                    } catch {
                        jobTitles[jobOfferId] = t("applications.jobDeleted");
                    }
                })
            );

            listSlot.innerHTML = "";

            // El PUT es parcial: solo se envía lo que cambia (el estado o la nota).
            const onStatusChange = async (id, status) => {
                await apiFetch(`/applications/${id}`, { method: "PUT", body: { status } });
                draw();
            };

            const onNotesSave = async (id, notes) => {
                await apiFetch(`/applications/${id}`, { method: "PUT", body: { notes } });
                draw();
            };

            const onWithdraw = (id) => openWithdrawDialog(async () => {
                await apiFetch(`/applications/${id}`, { method: "DELETE" });
                draw();
            });

            const renderCard = mode === "estado"
                ? (app) => statusCard(app, jobTitles[app.job_offer_id] || t("applications.noOffer"), onStatusChange, onWithdraw)
                : (app) => notesCard(app, jobTitles[app.job_offer_id] || t("applications.noOffer"), onNotesSave);

            // Una sola vez encima de la lista, no en cada tarjeta.
            if (mode === "estado" && applications.some((app) => app.job_offer_id)) {
                listSlot.append(el("p", { class: "form-note", text: t("applications.statusManagedByCompany") }));
            }
            listSlot.append(cardGrid(applications, renderCard, t("applications.emptyMessage")));
        } catch (error) {
            listSlot.innerHTML = "";
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
