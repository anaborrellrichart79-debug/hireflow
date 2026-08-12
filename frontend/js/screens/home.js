import { el, emptyState } from "../components/ui.js";
import { getCurrentUser } from "../auth.js";
import { t } from "../i18n.js";

export const render = (container) => {
    const user = getCurrentUser();
    const message = user.role === "recruiter"
        ? t("home.welcomeRecruiter")
        : t("home.welcomeCandidate");

    container.append(el("div", {}, [emptyState(message)]));
};
