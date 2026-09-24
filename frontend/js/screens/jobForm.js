import { el, errorBanner } from "../components/ui.js";
import { apiFetch, getCurrentUser } from "../api.js";
import { navigate } from "../router.js";
import { t } from "../i18n.js";
import { EMPLOYMENT_TYPE_CODES, SALARY_CODES, jobOptionLabel } from "../jobOptions.js";

const pillSingleSelect = (codes, selected, onChange) => {
    const wrapper = el("div", { class: "pill-group" });

    const buttons = codes.map((code) =>
        el("button", {
            type: "button",
            class: code === selected ? "pill active" : "pill",
            text: jobOptionLabel(code),
            onClick: () => {
                onChange(code);
                [...wrapper.children].forEach((btn) => btn.classList.remove("active"));
                buttons[codes.indexOf(code)].classList.add("active");
            }
        })
    );

    wrapper.append(...buttons);
    return wrapper;
};

export const render = async (container, params) => {
    const isEdit = Boolean(params?.id);
    container.append(el("p", { text: t("common.loading") }));

    let job = { title: "", company_id: "", description: "", location: "", employment_type: "", salary: "", skills_required: "" };
    let companies = [];

    try {
        companies = await apiFetch("/companies");
        if (isEdit) {
            job = await apiFetch(`/jobs/${params.id}`);
        }
    } catch (error) {
        container.innerHTML = "";
        container.append(errorBanner(error.message));
        return;
    }

    container.innerHTML = "";

    const errorSlot = el("div", {});

    // Solo se ofrecen las empresas propias (el backend rechaza publicar en
    // la de otro recruiter). Al editar se mantiene también la empresa actual
    // de la oferta, por si es anterior a companies.created_by_user.
    const userId = getCurrentUser().id;
    const selectableCompanies = companies.filter((c) =>
        c.created_by_user === userId || String(c.id) === String(job.company_id)
    );

    const companySelect = el("select", { name: "company_id" }, [
        el("option", { value: "", text: t("jobForm.selectCompanyPlaceholder") }),
        ...selectableCompanies.map((c) => el("option", {
            value: c.id,
            selected: String(c.id) === String(job.company_id) ? "true" : undefined,
            text: c.name
        }))
    ]);

    const newCompanyName = el("input", { type: "text", placeholder: t("jobForm.newCompanyNamePlaceholder"), autocomplete: "organization" });
    const newCompanyEmail = el("input", { type: "email", placeholder: t("jobForm.newCompanyEmailPlaceholder"), autocomplete: "email" });

    const titleInput = el("input", { type: "text", name: "title", value: job.title || "", placeholder: t("jobForm.titleLabel"), autocomplete: "organization-title" });
    const descriptionInput = el("textarea", { name: "description", rows: "3", text: job.description || "" });
    const locationInput = el("input", { type: "text", name: "location", value: job.location || "", placeholder: t("jobForm.locationLabel"), autocomplete: "address-level2" });
    const skillsInput = el("input", { type: "text", name: "skills_required", value: job.skills_required || "", placeholder: t("jobForm.skillsPlaceholder") });

    let employmentType = job.employment_type || "";
    let salary = job.salary || "";

    const submit = async (event) => {
        event.preventDefault();
        errorSlot.innerHTML = "";

        try {
            let companyId = companySelect.value;

            if (!companyId && newCompanyName.value.trim()) {
                const newCompany = await apiFetch("/companies", {
                    method: "POST",
                    body: { name: newCompanyName.value, email: newCompanyEmail.value }
                });
                companyId = newCompany.id;
            }

            const body = {
                company_id: Number(companyId),
                title: titleInput.value,
                description: descriptionInput.value || null,
                location: locationInput.value || null,
                employment_type: employmentType || null,
                salary: salary || null,
                skills_required: skillsInput.value || null
            };

            if (isEdit) {
                await apiFetch(`/jobs/${params.id}`, { method: "PUT", body });
            } else {
                await apiFetch("/jobs", { method: "POST", body });
            }

            navigate("/jobs");
        } catch (error) {
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.innerHTML = "";
            errorSlot.append(errorBanner(detail || error.message));
        }
    };

    const form = el("form", { class: "hireflow-form", onSubmit: submit }, [
        el("h2", { text: isEdit ? t("jobForm.editTitle") : t("jobForm.createTitle") }),
        errorSlot,
        el("label", { text: t("jobForm.companyLabel") }),
        companySelect,
        el("p", { class: "form-note", text: t("jobForm.newCompanyHint") }),
        newCompanyName,
        newCompanyEmail,
        el("label", { text: t("jobForm.titleLabel") }),
        titleInput,
        el("label", { text: t("jobForm.descriptionLabel") }),
        descriptionInput,
        el("label", { text: t("jobForm.locationLabel") }),
        locationInput,
        el("label", { text: t("jobForm.contractScheduleLabel") }),
        pillSingleSelect(EMPLOYMENT_TYPE_CODES, employmentType, (value) => { employmentType = value; }),
        el("label", { text: t("jobForm.salaryLabel") }),
        pillSingleSelect(SALARY_CODES, salary, (value) => { salary = value; }),
        el("label", { text: t("jobForm.skillsLabel") }),
        skillsInput,
        el("button", { type: "submit", class: "primary-button", text: isEdit ? t("jobForm.submitEdit") : t("jobForm.submitCreate") })
    ]);

    container.append(form);
};
