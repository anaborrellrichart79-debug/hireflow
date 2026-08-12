import { el, openDialog } from "./ui.js";
import { getPrivacyPolicy } from "../privacyPolicyContent.js";
import { getLang, t } from "../i18n.js";

export const openPrivacyPolicyDialog = () => {
    const policy = getPrivacyPolicy(getLang());

    const closeButton = el("button", { type: "button", class: "secondary-button", text: t("common.close") });

    const dialog = openDialog([
        el("h2", { id: "privacy-dialog-title", text: policy.title }),
        el("p", { class: "form-note", text: policy.updated }),
        ...policy.sections.flatMap((section) => [
            el("h3", { text: section.heading }),
            el("p", { text: section.body })
        ]),
        el("p", { class: "form-note", text: policy.disclaimer }),
        el("div", { class: "hf-dialog-actions" }, [closeButton])
    ], { labelledBy: "privacy-dialog-title" });

    closeButton.addEventListener("click", () => dialog.close());
};
