import { el, primaryButton, errorBanner, openDialog } from "../components/ui.js";
import { cardGrid } from "../components/cardGrid.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { navigate } from "../router.js";
import { t, getLang } from "../i18n.js";
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
        if (confirmButton.disabled) return;
        if (!consentCheckbox.checked) {
            errorSlot.append(errorBanner(t("jobs.consentRequired")));
            return;
        }
        if (!signatureInput.value.trim()) {
            errorSlot.append(errorBanner(t("jobs.signatureRequired")));
            return;
        }
        // Se desactiva mientras se envía: un doble clic creaba dos postulaciones.
        confirmButton.disabled = true;
        try {
            await onConfirm(signatureInput.value.trim());
            dialog.close();
        } catch (error) {
            // 409: ya había una postulación a esta oferta (por ejemplo, desde
            // otra pestaña). Se explica con el texto traducido.
            const detail = error.status === 409
                ? t("jobs.alreadyAppliedError")
                : error.errors?.map((e) => e.message).join(" · ") || error.message;
            errorSlot.append(errorBanner(detail));
        } finally {
            confirmButton.disabled = false;
        }
    });
};

// --- Tarjeta de oferta (ver docs/decisions.md, entrada 030) ---

// Color estable por empresa para el círculo con su inicial: siempre el mismo
// para la misma empresa, tonos suaves con texto oscuro (contraste > 7:1).
const AVATAR_COLORS = ["#f6c89a", "#f3b391", "#e9c46a", "#b8d8ba", "#a8c5e2", "#d4b8e0"];
const avatarColor = (name) => {
    let hash = 0;
    for (const char of name || "?") hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// "Valencia (híbrido)" -> "Valencia": el filtro de ubicación agrupa por ciudad.
const cityOf = (location) => (location || "").replace(/\s*\(.*\)\s*$/, "").trim();

const skillsOf = (job) => (job.skills_required || "").split(/[,;]/).map((skill) => skill.trim()).filter(Boolean);

// "Publicada hoy", "Publicada hace 3 días"... en el idioma activo.
const publishedLabel = (createdAt) => {
    const date = new Date(String(createdAt).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return null;
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
    const relative = new Intl.RelativeTimeFormat(getLang(), { numeric: "auto" });
    const text = Math.abs(days) < 30 ? relative.format(days, "day") : relative.format(Math.round(days / 30), "month");
    return `${t("jobs.published")} ${text}`;
};

const plural = (count, oneKey, manyKey) => `${count} ${t(count === 1 ? oneKey : manyKey)}`;

const jobCardHeader = (job) => {
    // El color va por element.style (la CSP no permite atributos style en el HTML).
    const avatar = el("span", { class: "company-avatar", "aria-hidden": "true", text: (job.company_name || job.title || "?").trim().charAt(0).toUpperCase() });
    avatar.style.background = avatarColor(job.company_name);
    return el("div", { class: "job-card-header" }, [
        avatar,
        el("div", {}, [
            el("h3", { text: job.title }),
            job.company_name ? el("p", { class: "job-company", text: job.company_name }) : null
        ])
    ]);
};

const jobCardDetails = (job) => {
    const skills = skillsOf(job);
    const published = publishedLabel(job.created_at);
    return [
        el("p", { class: "card-meta", text: [job.location, jobOptionLabel(job.employment_type)].filter(Boolean).join(" · ") || t("common.dash") }),
        job.salary ? el("span", { class: "salary-chip", text: jobOptionLabel(job.salary) }) : null,
        skills.length > 0
            ? el("ul", { class: "skill-chips", "aria-label": t("jobForm.skillsLabel") }, [
                ...skills.slice(0, 4).map((skill) => el("li", { class: "skill-chip", text: skill })),
                skills.length > 4 ? el("li", { class: "skill-chip skill-chip-more", text: `+${skills.length - 4}` }) : null
            ])
            : null,
        job.description ? el("p", { class: "card-desc job-desc", text: job.description }) : null,
        published ? el("p", { class: "job-published", text: published }) : null
    ];
};

const renderCandidateCard = (job, appliedJobOfferIds, onApply) => {
    const alreadyApplied = appliedJobOfferIds.has(job.id);

    return el("div", { class: "card-content job-card" }, [
        jobCardHeader(job),
        ...jobCardDetails(job),
        alreadyApplied
            ? el("span", { class: "status-badge", text: t("jobs.alreadyApplied") })
            : primaryButton(t("jobs.applyButton"), () => onApply(job.id))
    ]);
};

const renderRecruiterCard = (job, onDelete) =>
    el("div", { class: "card-content job-card" }, [
        jobCardHeader(job),
        ...jobCardDetails(job),
        el("button", {
            class: "applicants-count",
            type: "button",
            text: plural(Number(job.applicants_count) || 0, "jobs.applicantsOne", "jobs.applicantsMany"),
            onClick: () => navigate("/applicants")
        }),
        el("div", { class: "card-actions" }, [
            el("button", { class: "secondary-button", type: "button", text: t("common.edit"), onClick: () => navigate(`/jobs/edit/${job.id}`) }),
            el("button", { class: "secondary-button danger", type: "button", text: t("common.delete"), onClick: () => onDelete(job) })
        ])
    ]);

// Confirmación propia en vez del confirm() nativo del navegador.
const openDeleteJobDialog = (job, onConfirm) => {
    const errorSlot = el("div", {});
    const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("jobs.consentCancel") });
    const confirmButton = el("button", { type: "button", class: "primary-button", text: t("common.delete") });
    const dialog = openDialog([
        el("h2", { id: "delete-job-title", text: t("jobs.deleteConfirm") }),
        errorSlot,
        el("p", { text: job.title }),
        el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
    ], { labelledBy: "delete-job-title" });
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

// --- Buscador y filtros ---

const normalizeText = (text) => (text || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

const matchesFilters = (job, filters) => {
    if (filters.city && cityOf(job.location) !== filters.city) return false;
    if (filters.type && job.employment_type !== filters.type) return false;
    if (filters.query) {
        const haystack = normalizeText([job.title, job.company_name, job.skills_required, job.description, job.location].join(" "));
        return normalizeText(filters.query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
    }
    return true;
};

// Filtros que duran mientras dure la sesión en la pantalla (al postularse o
// cambiar de idioma se redibuja sin perderlos).
const filters = { query: "", city: "", type: "" };

const filterBar = (jobs, onChange) => {
    const cities = [...new Set(jobs.map((job) => cityOf(job.location)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const types = [...new Set(jobs.map((job) => job.employment_type).filter(Boolean))];

    const search = el("input", { type: "search", class: "job-search", value: filters.query, placeholder: t("jobs.searchPlaceholder"), "aria-label": t("jobs.searchPlaceholder") });
    search.addEventListener("input", () => { filters.query = search.value; onChange(); });

    const citySelect = el("select", { "aria-label": t("jobs.allLocations") }, [
        el("option", { value: "", text: t("jobs.allLocations") }),
        ...cities.map((city) => el("option", { value: city, selected: city === filters.city ? "true" : undefined, text: city }))
    ]);
    citySelect.addEventListener("change", () => { filters.city = citySelect.value; onChange(); });

    const typeSelect = el("select", { "aria-label": t("jobs.allTypes") }, [
        el("option", { value: "", text: t("jobs.allTypes") }),
        ...types.map((type) => el("option", { value: type, selected: type === filters.type ? "true" : undefined, text: jobOptionLabel(type) }))
    ]);
    typeSelect.addEventListener("change", () => { filters.type = typeSelect.value; onChange(); });

    return el("div", { class: "job-filters", role: "search" }, [search, citySelect, typeSelect]);
};

export const render = async (container) => {
    const user = getCurrentUser();
    const isRecruiter = user.role === "recruiter";
    const errorSlot = el("div", {});
    container.append(errorSlot);

    if (isRecruiter) {
        container.append(primaryButton(t("jobs.newOfferButton"), () => navigate("/jobs/new")));
    }

    const listSlot = el("div", { class: "list-slot job-list" }, [el("p", { text: t("common.loading") })]);
    container.append(listSlot);

    const draw = async () => {
        listSlot.innerHTML = "";
        try {
            const allJobs = await apiFetch("/jobs");
            const jobs = isRecruiter ? allJobs.filter((job) => job.created_by_user === user.id) : allJobs;

            let renderCard;
            if (isRecruiter) {
                const onDelete = (job) => openDeleteJobDialog(job, async () => {
                    await apiFetch(`/jobs/${job.id}`, { method: "DELETE" });
                    draw();
                });
                renderCard = (job) => renderRecruiterCard(job, onDelete);
            } else {
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
                renderCard = (job) => renderCandidateCard(job, appliedJobOfferIds, onApply);
            }

            if (jobs.length === 0) {
                listSlot.append(cardGrid([], renderCard, isRecruiter ? t("jobs.emptyRecruiter") : t("jobs.emptyCandidate")));
                return;
            }

            // Solo se redibuja la cuadrícula al filtrar: así el buscador no
            // pierde el foco mientras se escribe.
            const count = el("p", { class: "job-results-count", "aria-live": "polite" });
            const gridSlot = el("div", {});
            const drawGrid = () => {
                const visible = jobs.filter((job) => matchesFilters(job, filters));
                count.textContent = plural(visible.length, "jobs.resultsOne", "jobs.resultsMany");
                gridSlot.innerHTML = "";
                if (visible.length === 0) {
                    gridSlot.append(el("div", { class: "empty-state" }, [
                        el("p", { class: "empty-state-text", text: t("jobs.noResults") }),
                        el("button", {
                            type: "button", class: "secondary-button", text: t("jobs.clearFilters"),
                            onClick: () => { Object.assign(filters, { query: "", city: "", type: "" }); draw(); }
                        })
                    ]));
                    return;
                }
                gridSlot.append(cardGrid(visible, renderCard, ""));
            };

            listSlot.append(filterBar(jobs, drawGrid), count, gridSlot);
            drawGrid();
        } catch (error) {
            listSlot.append(errorBanner(error.message));
        }
    };

    draw();
};
