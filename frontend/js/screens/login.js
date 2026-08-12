import { el, errorBanner } from "../components/ui.js";
import { login, register } from "../auth.js";
import { navigate } from "../router.js";

export const render = (container) => {
    let mode = "login";

    const draw = () => {
        container.innerHTML = "";

        const errorSlot = el("div", { class: "form-error-slot" });

        const emailInput = el("input", { type: "email", name: "email", placeholder: "Email", required: "true" });
        const passwordInput = el("input", { type: "password", name: "password", placeholder: "Contraseña", required: "true" });

        const extraFields = mode === "register"
            ? [
                el("input", { type: "text", name: "name", placeholder: "Nombre", required: "true" }),
                el("select", { name: "role" }, [
                    el("option", { value: "candidate", text: "Busco empleo (candidate)" }),
                    el("option", { value: "recruiter", text: "Publico ofertas (recruiter)" })
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
            el("h2", { text: mode === "login" ? "Iniciar sesión" : "Crear cuenta" }),
            errorSlot,
            ...extraFields,
            emailInput,
            passwordInput,
            el("button", { type: "submit", class: "primary-button", text: mode === "login" ? "Entrar" : "Registrarme" })
        ]);

        const toggle = el("p", { class: "auth-toggle" }, [
            mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? ",
            el("a", {
                href: "#",
                text: mode === "login" ? "Regístrate" : "Inicia sesión",
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
