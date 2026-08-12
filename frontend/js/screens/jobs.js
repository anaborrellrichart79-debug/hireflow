import { el, primaryButton, errorBanner } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { navigate } from "../router.js";
import { t } from "../i18n.js";
import { jobOptionLabel } from "../jobOptions.js";

const renderCandidateCard = (job, appliedJobOfferIds, onApply) => {
    const alreadyApplied = appliedJobOfferIds.has(job.id);

    return el("div", { class: "card-content" }, [
        el("h3", { text: job.title }),
        el("p", { class: "card-meta", text: [job.location, jobOptionLabel(job.employment_type)].filter(Boolean).join(" · ") || t("common.dash") }),
        el("p", { class: "card-desc", text: job.description || "" }),
        alreadyApplied
            ? el("span", { class: "status-badge", text: t("jobs.alreadyApplied") })
            : primaryButton(t("jobs.applyButton"), () => onApply(job.id))
    ]);
};

const renderRecruiterCard = (job, onDelete) =>
    el("div", { class: "card-content" }, [
        el("h3", { text: job.title }),
        el("p", { class: "card-meta", text: [job.location, jobOptionLabel(job.employment_type)].filter(Boolean).join(" · ") || t("common.dash") }),
        el("div", { class: "card-actions" }, [
            el("button", { class: "secondary-button", type: "button", text: t("common.edit"), onClick: () => navigate(`/jobs/edit/${job.id}`) }),
            el("button", { class: "secondary-button danger", type: "button", text: t("common.delete"), onClick: () => onDelete(job.id) })
        ])
    ]);

export const render = async (container) => {
    const user = getCurrentUser();
    const errorSlot = el("div", {});
    container.append(errorSlot);

    if (user.role === "recruiter") {
        container.append(primaryButton(t("jobs.newOfferButton"), () => navigate("/jobs/new")));
    }

    const listSlot = el("div", { class: "list-slot" }, [el("p", { text: t("common.loading") })]);
    container.append(listSlot);

    const draw = async () => {
        listSlot.innerHTML = "";
        try {
            const jobs = await apiFetch("/jobs");

            if (user.role === "recruiter") {
                const ownJobs = jobs.filter((job) => job.created_by_user === user.id);
                const onDelete = async (id) => {
                    if (!confirm(t("jobs.deleteConfirm"))) return;
                    await apiFetch(`/jobs/${id}`, { method: "DELETE" });
                    draw();
                };
                listSlot.append(cardGrid(ownJobs, (job) => renderRecruiterCard(job, onDelete), t("jobs.emptyRecruiter")));
                return;
            }

            const applications = await apiFetch("/applications");
            const appliedJobOfferIds = new Set(applications.map((a) => a.job_offer_id).filter(Boolean));
            const onApply = async (jobOfferId) => {
                await apiFetch("/applications", { method: "POST", body: { job_offer_id: jobOfferId } });
                draw();
            };
            listSlot.append(cardGrid(jobs, (job) => renderCandidateCard(job, appliedJobOfferIds, onApply), t("jobs.emptyCandidate")));
        } catch (error) {
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
