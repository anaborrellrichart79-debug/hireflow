import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";

export const render = async (container) => {
    container.append(el("p", { text: "Cargando..." }));

    let profile;
    try {
        profile = await apiFetch("/users/me");
    } catch (error) {
        container.innerHTML = "";
        container.append(errorBanner(error.message));
        return;
    }

    container.innerHTML = "";

    const errorSlot = el("div", {});
    const successSlot = el("div", {});

    const nameInput = el("input", { type: "text", name: "name", value: profile.name || "" });
    const sectorInput = el("input", { type: "text", name: "sector", value: profile.sector || "" });
    const phoneInput = el("input", { type: "text", name: "phone", value: profile.phone || "" });
    const locationInput = el("input", { type: "text", name: "location", value: profile.location || "" });
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
            successSlot.append(el("p", { class: "success-text", text: "Perfil actualizado correctamente" }));
        } catch (error) {
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.append(errorBanner(detail || error.message));
        }
    };

    const form = el("form", { class: "hireflow-form", onSubmit: submit }, [
        el("h2", { text: "Mi perfil" }),
        el("p", { class: "form-note", text: "El CV extendido (habilidades, experiencia) todavía no está disponible: falta implementar el backend de perfil de candidato." }),
        errorSlot,
        successSlot,
        el("label", { text: "Nombre" }),
        nameInput,
        el("label", { text: "Sector" }),
        sectorInput,
        el("label", { text: "Teléfono" }),
        phoneInput,
        el("label", { text: "Ubicación" }),
        locationInput,
        el("label", { class: "checkbox-label" }, [visibleInput, " Perfil visible"]),
        el("button", { type: "submit", class: "primary-button", text: "Guardar" })
    ]);

    container.append(form);
};
