import { el, errorBanner, openDialog, emptyState } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { kanbanBoard } from "../components/kanban.js";
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

// Tarjeta del tablero. En una postulación a una oferta de HireFlow el estado
// lo mueve la empresa: la candidata lo ve (por la columna) y puede retirarla.
// Solo los seguimientos personales (sin oferta) conservan el desplegable.
// Ver decisions.md, entradas 023 y 031.
const boardCard = (app, job, isUnseen, onStatusChange, onWithdraw) => {
    const controls = app.job_offer_id
        ? el("button", { class: "secondary-button danger", type: "button", text: t("applications.withdrawButton"), onClick: () => onWithdraw(app.id) })
        : el("select", {
            "aria-label": `${t("applications.viewStatus")}: ${job.title}`,
            onChange: (event) => onStatusChange(app.id, event.target.value)
        }, STATUS_OPTIONS.map((status) =>
            el("option", { value: status, selected: status === app.status ? "true" : undefined, text: statusLabel(status) })
        ));

    return el("div", { class: "card-content" }, [
        el("h4", { class: "kanban-card-title", text: job.title }),
        job.company ? el("p", { class: "card-meta", text: job.company }) : null,
        isUnseen && app.status_updated_by === "recruiter"
            ? el("span", { class: "status-badge status-badge--new", text: t("applications.recentlyUpdated") })
            : null,
        controls
    ]);
};

const notesCard = (app, job, onNotesSave) => {
    const textarea = el("textarea", { rows: "3", "aria-label": `${t("applications.viewNotes")}: ${job.title}`, text: app.notes || "" });

    return el("div", { class: "card-content" }, [
        el("h3", { text: job.title }),
        job.company ? el("p", { class: "card-meta", text: job.company }) : null,
        textarea,
        el("button", {
            class: "secondary-button",
            type: "button",
            text: t("applications.saveNote"),
            onClick: () => onNotesSave(app.id, textarea.value)
        })
    ]);
};

// Orden de las columnas del tablero de la candidata. "Interesa" solo aparece
// si tiene algún seguimiento personal en ese estado.
const CANDIDATE_COLUMNS = ["applied", "interview", "offer", "rejected"];

export const render = async (container) => {
    let mode = "estado";

    const boardButton = el("button", { class: "secondary-button", type: "button", "aria-pressed": "true", text: t("applications.viewStatus"), onClick: () => setMode("estado") });
    const notesButton = el("button", { class: "secondary-button", type: "button", "aria-pressed": "false", text: t("applications.viewNotes"), onClick: () => setMode("notas") });
    const setMode = (newMode) => {
        mode = newMode;
        boardButton.setAttribute("aria-pressed", String(mode === "estado"));
        notesButton.setAttribute("aria-pressed", String(mode === "notas"));
        draw();
    };

    const listSlot = el("div", { class: "kanban-screen" });
    container.append(el("div", { class: "toggle-group" }, [boardButton, notesButton]), listSlot);

    // Qué postulaciones tenían cambios de la empresa sin ver AL ABRIR la
    // pantalla. Se calcula una sola vez: abrir la pantalla las marca como
    // vistas (mark-seen), y si se recalculara en cada redibujado el aviso
    // "¡Actualizado por la empresa!" desaparecería al primer cambio.
    let unseenIds = null;

    const draw = async () => {
        listSlot.innerHTML = "";
        listSlot.append(el("p", { text: t("common.loading") }));

        try {
            // Una sola petición a /jobs (trae título y empresa de todas) en vez
            // de una a /jobs/:id por cada postulación.
            const [applications, jobs] = await Promise.all([apiFetch("/applications"), apiFetch("/jobs")]);
            if (unseenIds === null) {
                unseenIds = new Set(applications.filter((app) => !app.status_seen_by_candidate).map((app) => app.id));
                // Efecto secundario intencional: abrir esta pantalla es la señal
                // de que la candidata ha visto los cambios pendientes (ver
                // home.js). Si falla, el aviso seguirá en Home la próxima vez.
                apiFetch("/applications/mark-seen", { method: "PUT" }).catch(() => {});
            }

            const jobsById = new Map(jobs.map((job) => [job.id, job]));
            const jobOf = (app) => {
                if (!app.job_offer_id) return { title: t("applications.noOffer"), company: null };
                const job = jobsById.get(app.job_offer_id);
                return job ? { title: job.title, company: job.company_name } : { title: t("applications.jobDeleted"), company: null };
            };

            listSlot.innerHTML = "";

            if (applications.length === 0) {
                listSlot.append(emptyState(t("applications.emptyMessage")));
                return;
            }

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

            if (mode === "notas") {
                listSlot.append(cardGrid(applications, (app) => notesCard(app, jobOf(app), onNotesSave), t("applications.emptyMessage")));
                return;
            }

            // Tablero de solo lectura: el estado lo mueve la empresa.
            if (applications.some((app) => app.job_offer_id)) {
                listSlot.append(el("p", { class: "form-note", text: t("applications.statusManagedByCompany") }));
            }
            const statuses = applications.some((app) => app.status === "wishlist")
                ? ["wishlist", ...CANDIDATE_COLUMNS]
                : CANDIDATE_COLUMNS;
            listSlot.append(kanbanBoard({
                columns: statuses.map((status) => ({ status, label: statusLabel(status) })),
                items: applications,
                getStatus: (app) => app.status,
                renderCard: (app) => boardCard(app, jobOf(app), unseenIds.has(app.id), onStatusChange, onWithdraw),
                emptyColumnText: t("applicants.emptyColumn")
            }));
        } catch (error) {
            listSlot.innerHTML = "";
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
