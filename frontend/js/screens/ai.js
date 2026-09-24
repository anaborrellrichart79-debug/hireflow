import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { t } from "../i18n.js";

// Chat libre sin categorías/pestañas: el usuario escribe lo que quiera y el
// backend (POST /ai/ask) clasifica la intención por palabras clave, pide
// aclaraciones si le falta información, o rechaza el tema si no tiene nada
// que ver con HireFlow. Ver docs/decisions.md, entrada 014.
//
// Sin estado en el servidor: en cada envío se manda el texto acumulado de
// todos los mensajes del usuario en la conversación (no solo el último),
// para que el clasificador tenga más contexto según avanza la charla.

// Botón de solo icono, siempre con title (tooltip al pasar el ratón) y
// alt en la imagen, para que se entienda su función sin depender del texto.
const iconButton = (iconFile, titleText, onClick, extraClass = "") =>
    el("button", {
        type: "button",
        class: `chat-icon-button ${extraClass}`.trim(),
        title: titleText,
        "aria-label": titleText,
        onClick
    }, [
        el("img", { src: `assets/icons/${iconFile}`, alt: titleText })
    ]);

// Categoría y dificultad llegan como códigos ("technical", "advanced"); se
// muestran traducidas. Si llega un código desconocido, se muestra tal cual.
const questionMeta = (q) => {
    const category = t(`ai.category.${q.category}`);
    const difficulty = t(`ai.difficulty.${q.difficulty}`);
    return `${category === `ai.category.${q.category}` ? q.category : category} · ${difficulty === `ai.difficulty.${q.difficulty}` ? q.difficulty : difficulty}`;
};

const renderGuides = (guides) =>
    el("div", { class: "chat-answer" }, [
        el("strong", { text: t("ai.labelGuides") }),
        ...guides.map((guide) => el("div", { class: "chat-card" }, [
            // "none" es la guía genérica (sin tipo de empresa): no hay nada que mostrar.
            guide.company_type && guide.company_type !== "none" ? el("p", { class: "chat-meta", text: guide.company_type }) : null,
            el("p", { text: guide.recomendations })
        ]))
    ]);

const renderQuestions = (questions) =>
    el("div", { class: "chat-answer" }, [
        el("strong", { text: t("ai.labelQuestions") }),
        ...questions.map((q) => el("div", { class: "chat-card" }, [
            el("p", { text: q.question }),
            el("span", { class: "chat-meta", text: questionMeta(q) })
        ]))
    ]);

const renderSkillTips = (suggestions) =>
    el("div", { class: "chat-answer" }, [
        el("strong", { text: t("ai.labelSkillTips") }),
        ...suggestions.map((s) => el("div", { class: "chat-card" }, [
            el("strong", { text: s.skill_name }),
            el("p", { text: s.description }),
            el("p", { text: s.improvement_methods }),
            el("p", { class: "chat-meta", text: s.resources })
        ]))
    ]);

const renderJobMatch = (data) => {
    const parts = [
        el("p", { text: `${data.job_title} — ${t("ai.labelMatchScore")} ${data.score ?? "?"}%` })
    ];

    if (data.matched_skills?.length) {
        parts.push(el("p", { text: `${t("ai.labelMatchedSkills")} ${data.matched_skills.join(", ")}` }));
    }

    if (data.missing_skills?.length) {
        parts.push(el("p", { text: `${t("ai.labelMissingSkills")} ${data.missing_skills.join(", ")}` }));
    }

    if (data.improvement_suggestions?.length) {
        parts.push(renderSkillTips(data.improvement_suggestions));
    }

    return el("div", { class: "chat-answer" }, parts);
};

const renderAnswer = (data) => {
    if (data.type === "off_topic" || data.type === "clarify") {
        return el("p", { text: data.message });
    }

    switch (data.intent) {
        case "cv_review": return renderGuides(data.guides);
        case "interview_questions": return renderQuestions(data.questions);
        case "interview_feedback": return renderSkillTips(data.suggestions);
        case "job_match": return renderJobMatch(data);
        default: return el("pre", { class: "ai-result-json", text: JSON.stringify(data, null, 2) });
    }
};

const chatBubble = (role, content) =>
    el("div", { class: `chat-message chat-${role}` }, [
        el("span", { class: "chat-role", text: role === "user" ? t("ai.you") : t("ai.assistantName") }),
        typeof content === "string" ? el("p", { text: content }) : content
    ]);

export const render = (container) => {
    // Contexto acumulado SOLO mientras el backend está pidiendo una
    // aclaración (misma pregunta sin resolver todavía). En cuanto llega una
    // respuesta ("answer") o se descarta el tema ("off_topic"), se reinicia:
    // si no, el siguiente mensaje seguiría arrastrando palabras clave de la
    // conversación ya cerrada y el clasificador nunca podría cambiar de tema.
    let pendingContext = [];
    // El archivo adjunto no se sube ni se lee -- no hay ningún endpoint que
    // procese su contenido (el asistente es un clasificador por palabras
    // clave, no un LLM que pueda leer documentos). Solo se referencia su
    // nombre en el mensaje enviado, y se avisa de esto en la UI para no
    // dar a entender que el contenido se analiza.
    let attachedFile = null;

    const transcript = el("div", { class: "chat-transcript" }, [
        el("p", { class: "chat-greeting", text: t("ai.chatGreeting") })
    ]);

    const sidebar = el("div", { class: "ai-sidebar" }, [
        el("div", { class: "ai-sidebar-box" }, [
            el("strong", { text: t("ai.whatCanDoTitle") }),
            el("p", { text: t("ai.whatCanDoDesc") })
        ])
    ]);

    const input = el("input", { type: "text", placeholder: t("ai.chatPlaceholder") });

    const chips = el("div", { class: "chat-chips" }, [
        el("button", { type: "button", class: "pill", text: t("ai.suggestion1"), onClick: () => { input.value = t("ai.suggestion1"); input.focus(); } }),
        el("button", { type: "button", class: "pill", text: t("ai.suggestion2"), onClick: () => { input.value = t("ai.suggestion2"); input.focus(); } }),
        el("button", { type: "button", class: "pill", text: t("ai.suggestion3"), onClick: () => { input.value = t("ai.suggestion3"); input.focus(); } })
    ]);

    const fileChipSlot = el("div", {});

    const renderFileChip = () => {
        fileChipSlot.innerHTML = "";
        if (!attachedFile) return;

        fileChipSlot.append(el("div", { class: "chat-file-chip", title: t("ai.attachedFileNote") }, [
            el("img", { src: "assets/icons/archivo.svg", alt: t("ai.attachedFileLabel") }),
            el("span", { text: `${t("ai.attachedFileLabel")} ${attachedFile.name}` }),
            iconButton("añadir.svg", t("ai.removeFileTitle"), () => {
                attachedFile = null;
                fileInput.value = "";
                renderFileChip();
            }, "chat-file-remove")
        ]));
    };

    const fileInput = el("input", { type: "file", accept: ".pdf,.doc,.docx,.txt", class: "chat-file-input" });
    fileInput.addEventListener("change", () => {
        attachedFile = fileInput.files[0] || null;
        renderFileChip();
    });

    const resetConversation = () => {
        pendingContext = [];
        attachedFile = null;
        fileInput.value = "";
        renderFileChip();
        transcript.innerHTML = "";
        transcript.append(el("p", { class: "chat-greeting", text: t("ai.chatGreeting") }));
    };

    const send = async () => {
        let text = input.value.trim();
        if (!text) return;

        if (attachedFile) {
            text += ` [${t("ai.attachedFileLabel")} ${attachedFile.name}]`;
        }

        pendingContext.push(text);
        transcript.append(chatBubble("user", text));
        input.value = "";
        attachedFile = null;
        fileInput.value = "";
        renderFileChip();
        transcript.scrollTop = transcript.scrollHeight;

        const pending = el("p", { class: "chat-pending", text: t("common.loading") });
        transcript.append(pending);

        try {
            const data = await apiFetch("/ai/ask", { method: "POST", body: { message: pendingContext.join(" . ") } });
            pending.remove();
            transcript.append(chatBubble("assistant", renderAnswer(data)));

            // "clarify" es la única situación en la que la siguiente
            // respuesta del usuario debe seguir sumándose al contexto ya
            // enviado -- cualquier otro resultado cierra el tema.
            if (data.type !== "clarify") {
                pendingContext = [];
            }
        } catch (error) {
            pending.remove();
            transcript.append(errorBanner(error.errors?.map((e) => e.message).join(" · ") || error.message));
            pendingContext = [];
        }

        transcript.scrollTop = transcript.scrollHeight;
    };

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            send();
        }
    });

    const inputRow = el("div", { class: "chat-input-row" }, [
        iconButton("adjuntar.svg", t("ai.attachTitle"), () => fileInput.click()),
        fileInput,
        input,
        iconButton("enviar.svg", t("ai.sendButton"), send, "chat-send-icon")
    ]);

    const newConvoButton = iconButton("añadir.svg", t("ai.newConversation"), resetConversation);

    container.append(el("div", { class: "ai-panel" }, [
        sidebar,
        el("div", { class: "ai-main" }, [
            newConvoButton,
            transcript,
            chips,
            fileChipSlot,
            inputRow
        ])
    ]));
};
