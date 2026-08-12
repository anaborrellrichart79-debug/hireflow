import { el, errorBanner } from "../components/ui.js";
import { login, register } from "../auth.js";
import { navigate } from "../router.js";
import { t } from "../i18n.js";

export const render = (container) => {
    let mode = "login";

    const draw = () => {
        container.innerHTML = "";

        const errorSlot = el("div", { class: "form-error-slot" });

        const emailInput = el("input", { type: "email", name: "email", placeholder: t("auth.emailPlaceholder"), required: "true" });
        const passwordInput = el("input", { type: "password", name: "password", placeholder: t("auth.passwordPlaceholder"), required: "true" });

        const extraFields = mode === "register"
            ? [
                el("input", { type: "text", name: "name", placeholder: t("auth.namePlaceholder"), required: "true" }),
                el("select", { name: "role" }, [
                    el("option", { value: "candidate", text: t("auth.roleCandidate") }),
                    el("option", { value: "recruiter", text: t("auth.roleRecruiter") })
                ])
            ]
            : [];

        const nameInput = extraFields[0];
        const roleSelect = extraFields[1];

        const submit = async (event) => {
            event.preventDefault();
            errorSlot.innerHTML = "";
            try {
                if (mode === "login") {
                    await login(emailInput.value, passwordInput.value);
                } else {
                    await register({
                        name: nameInput.value,
                        email: emailInput.value,
                        password: passwordInput.value,
                        role: roleSelect.value
                    });
                }
                navigate("/");
            } catch (error) {
                const detail = error.errors?.map((e) => e.message).join(" · ");
                errorSlot.innerHTML = "";
                errorSlot.append(errorBanner(detail || error.message));
            }
        };

        const form = el("form", { class: "auth-form", onSubmit: submit }, [
            el("h2", { text: mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle") }),
            errorSlot,
            ...extraFields,
            emailInput,
            passwordInput,
            el("button", { type: "submit", class: "primary-button", text: mode === "login" ? t("auth.loginButton") : t("auth.registerButton") })
        ]);

        const toggle = el("p", { class: "auth-toggle" }, [
            mode === "login" ? t("auth.noAccount") : t("auth.hasAccount"),
            el("a", {
                href: "#",
                text: mode === "login" ? t("auth.registerLink") : t("auth.loginLink"),
                onClick: (event) => {
                    event.preventDefault();
                    mode = mode === "login" ? "register" : "login";
                    draw();
                }
            })
        ]);

        container.append(el("div", { class: "auth-screen" }, [form, toggle]));
    };

    draw();
};
