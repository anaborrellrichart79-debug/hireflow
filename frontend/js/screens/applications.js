import { el, errorBanner } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";
import { STATUS_OPTIONS, statusLabel } from "../applicationStatus.js";

const statusCard = (app, jobTitle, onStatusChange) => {
    const select = el("select", {
        onChange: (event) => onStatusChange(app.id, event.target.value)
    }, STATUS_OPTIONS.map((status) =>
        el("option", { value: status, selected: status === app.status ? "true" : undefined, text: statusLabel(status) })
    ));

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
        select
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

            const onStatusChange = async (id, status) => {
                const app = applications.find((a) => a.id === id);
                await apiFetch(`/applications/${id}`, { method: "PUT", body: { status, notes: app.notes } });
                draw();
            };

            const onNotesSave = async (id, notes) => {
                const app = applications.find((a) => a.id === id);
                await apiFetch(`/applications/${id}`, { method: "PUT", body: { status: app.status, notes } });
                draw();
            };

            const renderCard = mode === "estado"
                ? (app) => statusCard(app, jobTitles[app.job_offer_id] || t("applications.noOffer"), onStatusChange)
                : (app) => notesCard(app, jobTitles[app.job_offer_id] || t("applications.noOffer"), onNotesSave);

            listSlot.append(cardGrid(applications, renderCard, t("applications.emptyMessage")));
        } catch (error) {
            listSlot.innerHTML = "";
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
