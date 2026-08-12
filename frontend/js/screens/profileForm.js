import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";

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
            const detail = error.errors?.map((e) => e.message).join(" · ");
            errorSlot.append(errorBanner(detail || error.message));
        }
    };

    const form = el("form", { class: "hireflow-form", onSubmit: submit }, [
        el("h2", { text: t("profile.title") }),
        el("p", { class: "form-note", text: t("profile.cvNote") }),
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
};
