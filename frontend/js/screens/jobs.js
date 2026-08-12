import { el, primaryButton, errorBanner, openDialog } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { navigate } from "../router.js";
import { t } from "../i18n.js";
import { jobOptionLabel } from "../jobOptions.js";

// Antes de crear la postulación se pide consentimiento explícito para
// compartir nombre/email/teléfono con la empresa (nunca datos bancarios ni
// sensibles) y una "firma" ligera -- el candidato escribe su nombre completo
// para confirmar. No es una firma digital criptográfica/legal, es una
// confirmación de consentimiento en UX, documentado en decisions.md, entrada 017.
const openApplyConsentDialog = (candidateName, onConfirm) => {
    const errorSlot = el("div", {});
    const consentCheckbox = el("input", { type: "checkbox" });
    const signatureInput = el("input", { type: "text", autocomplete: "name", value: candidateName || "", placeholder: t("jobs.signaturePlaceholder") });

    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("jobs.consentCancel") });
    const confirmButton = el("button", { type: "button", class: "primary-button", text: t("jobs.consentSubmit") });

    const dialog = openDialog([
        el("h2", { id: "consent-dialog-title", text: t("jobs.consentTitle") }),
        errorSlot,
        el("p", { text: t("jobs.consentIntro") }),
        el("label", { class: "checkbox-label" }, [consentCheckbox, ` ${t("jobs.consentCheckboxLabel")}`]),
        el("label", { text: t("jobs.signatureLabel") }),
        signatureInput,
        el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
    ], { labelledBy: "consent-dialog-title" });

    cancelButton.addEventListener("click", () => dialog.close());

    confirmButton.addEventListener("click", async () => {
        errorSlot.innerHTML = "";
        if (!consentCheckbox.checked) {
            errorSlot.append(errorBanner(t("jobs.consentRequired")));
            return;
        }
        if (!signatureInput.value.trim()) {
            errorSlot.append(errorBanner(t("jobs.signatureRequired")));
            return;
        }
        try {
            await onConfirm(signatureInput.value.trim());
            dialog.close();
        } catch (error) {
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.append(errorBanner(detail || error.message));
        }
    });
};

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
            const onApply = (jobOfferId) => {
                // El JWT solo trae id/email/role (ver api.js getCurrentUser), no el
                // nombre -- el candidato escribe su firma desde cero, no se prerrellena.
                openApplyConsentDialog(null, async (signature) => {
                    await apiFetch("/applications", {
                        method: "POST",
                        body: { job_offer_id: jobOfferId, consent: true, signature }
                    });
                    draw();
                });
            };
            listSlot.append(cardGrid(jobs, (job) => renderCandidateCard(job, appliedJobOfferIds, onApply), t("jobs.emptyCandidate")));
        } catch (error) {
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
