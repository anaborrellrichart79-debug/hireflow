import { el, errorBanner } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";

const STATUS_OPTIONS = ["wishlist", "applied", "interview", "offer", "rejected"];
const STATUS_LABEL_KEYS = {
    wishlist: "applications.statusWishlist",
    applied: "applications.statusApplied",
    interview: "applications.statusInterview",
    offer: "applications.statusOffer",
    rejected: "applications.statusRejected"
};
const statusLabel = (status) => t(STATUS_LABEL_KEYS[status] || status);

const statusCard = (app, jobTitle, onStatusChange) => {
    const select = el("select", {
        onChange: (event) => onStatusChange(app.id, event.target.value)
    }, STATUS_OPTIONS.map((status) =>
        el("option", { value: status, selected: status === app.status ? "true" : undefined, text: statusLabel(status) })
    ));

    return el("div", { class: "card-content" }, [
        el("h3", { text: jobTitle }),
        el("span", { class: "status-badge", text: statusLabel(app.status) }),
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
