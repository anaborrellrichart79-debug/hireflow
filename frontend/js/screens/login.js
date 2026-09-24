import { el, errorBanner } from "../components/ui.js";
import { login, register } from "../auth.js";
import { navigate } from "../router.js";
import { t } from "../i18n.js";
import { openPrivacyPolicyDialog } from "../components/privacyPolicyDialog.js";

export const render = (container) => {
    let mode = "login";

    const draw = () => {
        container.innerHTML = "";

        const errorSlot = el("div", { class: "form-error-slot" });

        const emailInput = el("input", {
            type: "email", name: "email", placeholder: t("auth.emailPlaceholder"),
            autocomplete: mode === "login" ? "username" : "email", required: "true"
        });
        const passwordInput = el("input", {
            type: "password", name: "password", placeholder: t("auth.passwordPlaceholder"),
            autocomplete: mode === "login" ? "current-password" : "new-password", required: "true",
            // Mismas reglas que createUserValidators (backend): solo al registrarse,
            // en el login no se valida el formato para no dar pistas.
            minlength: mode === "register" ? "8" : undefined,
            maxlength: mode === "register" ? "72" : undefined
        });

        const extraFields = mode === "register"
            ? [
                el("input", { type: "text", name: "name", placeholder: t("auth.namePlaceholder"), autocomplete: "name", required: "true" }),
                el("select", { name: "role" }, [
                    el("option", { value: "candidate", text: t("auth.roleCandidate") }),
                    el("option", { value: "recruiter", text: t("auth.roleRecruiter") })
                ])
            ]
            : [];

        const nameInput = extraFields[0];
        const roleSelect = extraFields[1];

        // El enlace queda FUERA del <label> a propósito: un <label> que
        // envuelve un checkbox activa ese checkbox al hacer click en
        // cualquier punto de su interior, incluido encima de un <a> anidado
        // en algunos navegadores -- eso hacía que pulsar el enlace a veces
        // solo marcase la casilla en vez de abrir el diálogo de la política.
        const termsCheckbox = el("input", { type: "checkbox", name: "termsAccepted" });
        const termsLink = el("a", {
            href: "#",
            text: t("auth.privacyPolicyLinkText"),
            onClick: (event) => { event.preventDefault(); openPrivacyPolicyDialog(); }
        });
        const termsField = mode === "register"
            ? el("p", { class: "checkbox-label" }, [
                el("label", {}, [termsCheckbox, ` ${t("auth.termsAcceptPrefix")} `]),
                termsLink
            ])
            : null;

        const submit = async (event) => {
            event.preventDefault();
            errorSlot.innerHTML = "";
            try {
                if (mode === "login") {
                    await login(emailInput.value, passwordInput.value);
                } else {
                    if (!termsCheckbox.checked) {
                        errorSlot.append(errorBanner(t("auth.termsRequired")));
                        return;
                    }
                    const password = passwordInput.value;
                    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
                        errorSlot.append(errorBanner(t("auth.passwordRules")));
                        return;
                    }
                    await register({
                        name: nameInput.value,
                        email: emailInput.value,
                        password: passwordInput.value,
                        role: roleSelect.value,
                        termsAccepted: true
                    });
                }
                navigate("/");
            } catch (error) {
                errorSlot.innerHTML = "";
                // 401 (credenciales incorrectas) y 429 (demasiados intentos)
                // se traducen aquí: el mensaje del backend solo está en español.
                if (error.status === 401) {
                    errorSlot.append(errorBanner(t("auth.invalidCredentials")));
                    return;
                }
                if (error.status === 429) {
                    errorSlot.append(errorBanner(t("auth.tooManyAttempts")));
                    return;
                }
                const detail = error.errors?.map((e) => e.message).join(" · ");
                errorSlot.append(errorBanner(detail || error.message));
            }
        };

        const form = el("form", { class: "auth-form", onSubmit: submit }, [
            el("h2", { text: mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle") }),
            errorSlot,
            ...extraFields,
            emailInput,
            passwordInput,
            termsField,
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
