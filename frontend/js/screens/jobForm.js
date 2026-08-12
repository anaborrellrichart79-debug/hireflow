import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { navigate } from "../router.js";

const CONTRACT_TYPES = ["Indefinido", "Corta duración", "Por horas"];
const SCHEDULES = ["Completa", "Media Jornada", "A convenir"];
const SALARY_RANGES = ["Mínimo interprofesional", "1600€ brutos", "1900€ brutos", "2200€ brutos", "Según experiencia"];

// job_offers.employment_type y .salary son columnas de texto simples (no
// tablas de valores múltiples), así que aunque el mockup las dibuja como
// checkboxes, aquí se implementan como selección única (tipo pill/radio)
// para que encajen con el modelo de datos real.
const pillSingleSelect = (options, selected, onChange) => {
    const wrapper = el("div", { class: "pill-group" });

    const buttons = options.map((option) =>
        el("button", {
            type: "button",
            class: option === selected ? "pill active" : "pill",
            text: option,
            onClick: () => {
                onChange(option);
                [...wrapper.children].forEach((btn) => btn.classList.remove("active"));
                buttons.find((b) => b.textContent === option).classList.add("active");
            }
        })
    );

    wrapper.append(...buttons);
    return wrapper;
};

export const render = async (container, params) => {
    const isEdit = Boolean(params?.id);
    container.append(el("p", { text: "Cargando..." }));

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

    const companySelect = el("select", { name: "company_id" }, [
        el("option", { value: "", text: "-- Selecciona una empresa --" }),
        ...companies.map((c) => el("option", {
            value: c.id,
            selected: String(c.id) === String(job.company_id) ? "true" : undefined,
            text: c.name
        }))
    ]);

    const newCompanyName = el("input", { type: "text", placeholder: "Nombre de la nueva empresa" });
    const newCompanyEmail = el("input", { type: "email", placeholder: "Email de contacto de la empresa" });

    const titleInput = el("input", { type: "text", name: "title", value: job.title || "", placeholder: "Título de la oferta" });
    const descriptionInput = el("textarea", { name: "description", rows: "3", text: job.description || "" });
    const locationInput = el("input", { type: "text", name: "location", value: job.location || "", placeholder: "Ubicación" });
    const skillsInput = el("input", { type: "text", name: "skills_required", value: job.skills_required || "", placeholder: "Skills separadas por comas" });

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
        el("h2", { text: isEdit ? "Editar oferta laboral" : "Crear oferta laboral" }),
        errorSlot,
        el("label", { text: "Empresa" }),
        companySelect,
        el("p", { class: "form-note", text: "¿No está en la lista? Crea una nueva:" }),
        newCompanyName,
        newCompanyEmail,
        el("label", { text: "Título de la oferta" }),
        titleInput,
        el("label", { text: "Descripción" }),
        descriptionInput,
        el("label", { text: "Ubicación" }),
        locationInput,
        el("label", { text: "Tipo de contrato / jornada" }),
        pillSingleSelect(CONTRACT_TYPES.concat(SCHEDULES), employmentType, (value) => { employmentType = value; }),
        el("label", { text: "Salario" }),
        pillSingleSelect(SALARY_RANGES, salary, (value) => { salary = value; }),
        el("label", { text: "Skills requeridas" }),
        skillsInput,
        el("button", { type: "submit", class: "primary-button", text: isEdit ? "Guardar cambios" : "Crear oferta" })
    ]);

    container.append(form);
};
