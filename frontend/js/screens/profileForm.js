import { el, errorBanner, openDialog } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { getCurrentUser, logout } from "../auth.js";
import { navigate } from "../router.js";
import { ACCOUNT_DELETED_KEY } from "./login.js";
import { t } from "../i18n.js";

const errorDetail = (error) => error.errors?.map((e) => e.message).join(" · ") || error.message;

// CV extendido (tabla user_profiles, GET/PUT/DELETE /users/me/cv), solo para
// candidate. Formulario aparte del perfil básico porque es otro recurso con su
// propio endpoint -- ver docs/decisions.md, entrada 033.
const renderCvForm = async () => {
    let cv;
    try {
        // Sin CV guardado, la API devuelve los campos a null -> formulario vacío
        cv = await apiFetch("/users/me/cv");
    } catch (error) {
        return errorBanner(error.message);
    }

    const errorSlot = el("div", {});
    const successSlot = el("div", {});

    const aboutInput = el("textarea", { name: "about", rows: "3", text: cv.about || "" });
    const skillsInput = el("textarea", { name: "skills", rows: "2", placeholder: t("profile.cvSkillsPlaceholder"), text: cv.skills || "" });
    const experienceInput = el("textarea", { name: "work_experience", rows: "4", text: cv.work_experience || "" });
    const educationInput = el("textarea", { name: "education", rows: "3", text: cv.education || "" });
    const resumeUrlInput = el("input", { type: "url", name: "resume_url", value: cv.resume_url || "", placeholder: "https://", autocomplete: "url" });

    const inputs = [aboutInput, skillsInput, experienceInput, educationInput, resumeUrlInput];

    const submit = async (event) => {
        event.preventDefault();
        errorSlot.innerHTML = "";
        successSlot.innerHTML = "";
        try {
            // Campo vacío -> null, para poder borrar un campo concreto del CV
            const body = Object.fromEntries(inputs.map((input) => [input.name, input.value.trim() || null]));
            await apiFetch("/users/me/cv", { method: "PUT", body });
            successSlot.append(el("p", { class: "success-text", text: t("profile.cvSuccessMessage") }));
        } catch (error) {
            errorSlot.append(errorBanner(errorDetail(error)));
        }
    };

    const deleteCv = async () => {
        errorSlot.innerHTML = "";
        successSlot.innerHTML = "";
        try {
            await apiFetch("/users/me/cv", { method: "DELETE" });
        } catch (error) {
            // 404 = no había CV guardado; el formulario se vacía igualmente
            if (error.status !== 404) throw error;
        }
        inputs.forEach((input) => { input.value = ""; });
        successSlot.append(el("p", { class: "success-text", text: t("profile.cvDeletedMessage") }));
    };

    // Confirmación propia (no el confirm() nativo), igual que en Ofertas y
    // Mis postulaciones -- ver docs/decisions.md, entradas 023 y 030
    const onDelete = () => {
        const dialogError = el("div", {});
        const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("jobs.consentCancel") });
        const confirmButton = el("button", { type: "button", class: "primary-button", text: t("profile.cvDeleteButton") });
        const dialog = openDialog([
            el("h2", { id: "delete-cv-title", text: t("profile.cvDeleteButton") }),
            dialogError,
            el("p", { text: t("profile.cvDeleteConfirm") }),
            el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
        ], { labelledBy: "delete-cv-title" });
        cancelButton.addEventListener("click", () => dialog.close());
        confirmButton.addEventListener("click", async () => {
            dialogError.innerHTML = "";
            try {
                await deleteCv();
                dialog.close();
            } catch (error) {
                dialogError.append(errorBanner(errorDetail(error)));
            }
        });
    };

    return el("form", { class: "hireflow-form", onSubmit: submit }, [
        el("h2", { text: t("profile.cvTitle") }),
        el("p", { class: "form-note", text: t("profile.cvNote") }),
        errorSlot,
        successSlot,
        el("label", { text: t("profile.cvAboutLabel") }),
        aboutInput,
        el("label", { text: t("profile.cvSkillsLabel") }),
        skillsInput,
        el("label", { text: t("profile.cvExperienceLabel") }),
        experienceInput,
        el("label", { text: t("profile.cvEducationLabel") }),
        educationInput,
        el("label", { text: t("profile.cvResumeUrlLabel") }),
        resumeUrlInput,
        el("button", { type: "submit", class: "primary-button", text: t("common.save") }),
        el("button", { type: "button", class: "secondary-button danger", text: t("profile.cvDeleteButton"), onClick: onDelete })
    ]);
};

// Eliminar la cuenta desde la propia app: lo exige Google Play a cualquier
// app que permita crear cuentas. Pide la contraseña (el backend también) y
// explica qué se borra según el rol. Ver docs/decisions.md, entrada 042.
const renderDeleteAccountSection = (role) => {
    const openDeleteAccountDialog = () => {
        const errorSlot = el("div", {});
        const passwordInput = el("input", { type: "password", name: "current-password", autocomplete: "current-password" });
        const cancelButton = el("button", { type: "button", class: "secondary-button", text: t("jobs.consentCancel") });
        const confirmButton = el("button", { type: "button", class: "primary-button", text: t("profile.deleteAccountConfirm") });

        const dialog = openDialog([
            el("h2", { id: "delete-account-title", text: t("profile.deleteAccountDialogTitle") }),
            errorSlot,
            el("p", { text: t(role === "recruiter" ? "profile.deleteAccountTextRecruiter" : "profile.deleteAccountTextCandidate") }),
            el("label", { text: t("profile.deleteAccountPasswordLabel") }),
            passwordInput,
            el("div", { class: "hf-dialog-actions" }, [cancelButton, confirmButton])
        ], { labelledBy: "delete-account-title" });

        cancelButton.addEventListener("click", () => dialog.close());
        confirmButton.addEventListener("click", async () => {
            errorSlot.innerHTML = "";
            if (confirmButton.disabled) return;
            confirmButton.disabled = true;
            try {
                await apiFetch("/users/me", { method: "DELETE", body: { password: passwordInput.value } });
                dialog.close();
                logout();
                // El login avisa de que la cuenta se ha eliminado (ver login.js)
                try { sessionStorage.setItem(ACCOUNT_DELETED_KEY, "1"); } catch { /* sin sessionStorage: sin aviso */ }
                navigate("/login");
            } catch (error) {
                errorSlot.append(errorBanner(errorDetail(error)));
            } finally {
                confirmButton.disabled = false;
            }
        });
    };

    return el("section", { class: "hireflow-form danger-zone", "aria-labelledby": "delete-account-heading" }, [
        el("h2", { id: "delete-account-heading", text: t("profile.deleteAccountTitle") }),
        el("p", { class: "form-note", text: t(role === "recruiter" ? "profile.deleteAccountTextRecruiter" : "profile.deleteAccountTextCandidate") }),
        el("button", { type: "button", class: "secondary-button danger", text: t("profile.deleteAccountButton"), onClick: openDeleteAccountDialog })
    ]);
};

export const render = async (container) => {
    container.append(el("p", { text: t("common.loading") }));

    let profile;
    try {
        profile = await apiFetch("/users/me");
    } catch (error) {
        container.innerHTML = "";
        container.append(errorBanner(error.message));
        return;
    }

    const cvForm = getCurrentUser()?.role === "candidate" ? await renderCvForm() : null;

    container.innerHTML = "";

    const errorSlot = el("div", {});
    const successSlot = el("div", {});

    const nameInput = el("input", { type: "text", name: "name", value: profile.name || "", autocomplete: "name" });
    const sectorInput = el("input", { type: "text", name: "sector", value: profile.sector || "", autocomplete: "organization-title" });
    const phoneInput = el("input", { type: "tel", name: "phone", value: profile.phone || "", autocomplete: "tel" });
    const locationInput = el("input", { type: "text", name: "location", value: profile.location || "", autocomplete: "address-level2" });
    const visibleInput = el("input", { type: "checkbox", name: "profile_visible", checked: profile.profile_visible ? "true" : undefined });

    const submit = async (event) => {
        event.preventDefault();
        errorSlot.innerHTML = "";
        successSlot.innerHTML = "";
        try {
            await apiFetch("/users/me", {
                method: "PUT",
                body: {
                    name: nameInput.value,
                    sector: sectorInput.value || null,
                    phone: phoneInput.value || null,
                    location: locationInput.value || null,
                    profile_visible: visibleInput.checked
                }
            });
            successSlot.append(el("p", { class: "success-text", text: t("profile.successMessage") }));
        } catch (error) {
            errorSlot.append(errorBanner(errorDetail(error)));
        }
    };

    const form = el("form", { class: "hireflow-form", onSubmit: submit }, [
        el("h2", { text: t("profile.title") }),
        errorSlot,
        successSlot,
        el("label", { text: t("profile.nameLabel") }),
        nameInput,
        el("label", { text: t("profile.sectorLabel") }),
        sectorInput,
        el("label", { text: t("profile.phoneLabel") }),
        phoneInput,
        el("label", { text: t("profile.locationLabel") }),
        locationInput,
        el("label", { class: "checkbox-label" }, [visibleInput, ` ${t("profile.visibleLabel")}`]),
        el("button", { type: "submit", class: "primary-button", text: t("common.save") })
    ]);

    container.append(form);
    if (cvForm) {
        container.append(cvForm);
    }
    container.append(renderDeleteAccountSection(getCurrentUser()?.role));
};
