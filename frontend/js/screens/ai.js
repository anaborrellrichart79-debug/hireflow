import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";

// Nota: esta pantalla es una versión funcional simple (formularios por
// función), no el chat de conversación libre con "import" de documentos
// que describe FRONTEND_DESIGN.md. Esa parte queda pendiente a propósito
// -- los 4 endpoints de IA son consultas sobre catálogo, no un LLM con el
// que se pueda conversar libremente (ver docs/decisions.md, entrada 010).
const FUNCTIONS = {
    "cv-review": {
        label: "Revisión de CV",
        fields: [{ name: "industry", label: "Industria (ej. startups)", required: true }, { name: "company_type", label: "Tipo de empresa (opcional)" }]
    },
    "interview-questions": {
        label: "Preguntas de entrevista",
        fields: [{ name: "category", label: "Categoría (opcional): personal/technical/behavioral/stress/culture_fit" }, { name: "difficulty", label: "Dificultad (opcional): basic/intermediate/advanced" }]
    },
    "interview-feedback": {
        label: "Consejos de mejora",
        fields: [{ name: "skills", label: "Skills, separadas por comas", required: true }]
    },
    "job-match": {
        label: "Match con una oferta",
        fields: [{ name: "job_offer_id", label: "ID de la oferta", required: true }, { name: "skills", label: "Tus skills (texto libre)", required: true }]
    }
};

const buildBody = (functionKey, formData) => {
    if (functionKey === "interview-feedback") {
        return { skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean) };
    }
    if (functionKey === "job-match") {
        return { job_offer_id: Number(formData.job_offer_id), skills: formData.skills };
    }
    const body = {};
    Object.entries(formData).forEach(([key, value]) => {
        if (value) body[key] = value;
    });
    return body;
};

export const render = (container) => {
    let currentFunction = "cv-review";

    const sidebar = el("div", { class: "ai-sidebar" }, [
        el("div", { class: "ai-sidebar-box" }, [
            el("strong", { text: "Qué puede hacer" }),
            el("p", { text: "Consulta recomendaciones de CV, preguntas de entrevista, consejos de mejora de skills y compatibilidad con una oferta. Basado en catálogo, no es un chat libre." })
        ])
    ]);

    const resultPanel = el("div", { class: "ai-result", text: "Elige una función y pulsa Preguntar." });

    const tabs = el("div", { class: "ai-tabs" }, Object.entries(FUNCTIONS).map(([key, def]) =>
        el("button", {
            type: "button",
            class: key === currentFunction ? "pill active" : "pill",
            text: def.label,
            onClick: () => { currentFunction = key; drawForm(); }
        })
    ));

    const formSlot = el("div", { class: "ai-form-slot" });

    const drawForm = () => {
        [...tabs.children].forEach((btn) => btn.classList.remove("active"));
        formSlot.innerHTML = "";

        const def = FUNCTIONS[currentFunction];
        const inputs = {};

        def.fields.forEach((field) => {
            const input = el("input", { type: "text", placeholder: field.label, name: field.name });
            inputs[field.name] = input;
            formSlot.append(input);
        });

        const errorSlot = el("div", {});
        formSlot.append(errorSlot);

        const submit = async () => {
            errorSlot.innerHTML = "";
            const formData = {};
            Object.entries(inputs).forEach(([name, input]) => { formData[name] = input.value; });

            try {
                const data = await apiFetch(`/ai/${currentFunction}`, { method: "POST", body: buildBody(currentFunction, formData) });
                resultPanel.innerHTML = "";
                resultPanel.append(el("pre", { class: "ai-result-json", text: JSON.stringify(data, null, 2) }));
            } catch (error) {
                const detail = error.errors?.map((e) => e.message).join(" · ");
                errorSlot.innerHTML = "";
                errorSlot.append(errorBanner(detail || error.message));
            }
        };

        formSlot.append(el("button", { class: "primary-button", type: "button", text: "Preguntar", onClick: submit }));
        tabs.querySelectorAll("button").forEach((btn) => {
            if (btn.textContent === def.label) btn.classList.add("active");
        });
    };

    drawForm();

    container.append(el("div", { class: "ai-panel" }, [
        sidebar,
        el("div", { class: "ai-main" }, [tabs, resultPanel, formSlot])
    ]));
};
