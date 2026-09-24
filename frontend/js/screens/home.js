import { el, errorBanner } from "../components/ui.js";
import { apiFetch } from "../api.js";
import { getCurrentUser } from "../auth.js";
import { navigate } from "../router.js";
import { t, getLang } from "../i18n.js";
import { statusLabel } from "../applicationStatus.js";
import { buildRecruiterDashboard } from "../components/recruiterDashboard.js";

const CANDIDATE_LINKS = () => [
    ["/jobs", t("nav.jobsCandidate")],
    ["/applications", t("nav.applications")],
    ["/calendar", t("nav.calendar")],
    ["/profile", t("nav.profile")],
    ["/ai", t("nav.ai")]
];

const RECRUITER_LINKS = () => [
    ["/jobs", t("nav.jobsRecruiter")],
    ["/applicants", t("nav.applicants")],
    ["/calendar", t("nav.calendar")],
    ["/ai", t("nav.ai")]
];

const quickLinksGrid = (links) =>
    el("div", { class: "gradient-container" }, [
        el("div", { class: "card-grid" }, links.map(([path, label]) =>
            el("button", {
                class: "card quick-link-card",
                type: "button",
                text: label,
                onClick: () => navigate(path)
            })
        ))
    ]);

const statCard = (value, label) =>
    el("div", { class: "stat-card" }, [
        el("span", { class: "stat-value", text: String(value) }),
        el("span", { class: "stat-label", text: label })
    ]);

const formatDateTime = (isoLike) => {
    const date = new Date(isoLike.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return isoLike;
    return date.toLocaleString(getLang(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const buildCandidateSummary = async () => {
    const [applications, interviews] = await Promise.all([
        apiFetch("/applications"),
        apiFetch("/interviews")
    ]);

    const byStatus = {};
    applications.forEach((app) => {
        byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    });

    const now = new Date();
    const nextInterview = interviews
        .filter((i) => new Date(i.scheduled_date.replace(" ", "T")) >= now)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

    // status_seen_by_candidate se pone a 0 cuando la empresa cambia el estado
    // (ver applicationControllers.js updateApplicationStatusAsRecruiter) y
    // vuelve a 1 al abrir "Mis postulaciones" (applications.js llama a
    // PUT /applications/mark-seen) -- así el candidato ve aquí que hay
    // novedades sin tener que revisar postulación por postulación.
    const unseenCount = applications.filter((app) => !app.status_seen_by_candidate).length;

    const statCards = [
        statCard(applications.length, t("home.summaryTotalApplications")),
        statCard(nextInterview ? formatDateTime(nextInterview.scheduled_date) : t("home.summaryNoInterview"), t("home.summaryNextInterview"))
    ];
    if (unseenCount > 0) {
        statCards.push(statCard(unseenCount, t("home.summaryUnseenUpdates")));
    }

    const stats = el("div", { class: "stat-row" }, statCards);

    const badges = el("div", { class: "status-badge-row" },
        Object.entries(byStatus).map(([status, count]) =>
            el("span", { class: "status-badge", text: `${statusLabel(status)}: ${count}` })
        )
    );

    return el("div", { class: "home-summary" }, [stats, badges]);
};

export const render = async (container) => {
    const user = getCurrentUser();
    const isRecruiter = user.role === "recruiter";

    const welcome = el("p", { class: "home-welcome", text: isRecruiter ? t("home.welcomeRecruiter") : t("home.welcomeCandidate") });
    // El panel de la empresa es más ancho que el resumen de la candidata (entrada 032).
    const summarySlot = el("div", { class: isRecruiter ? "home-dashboard" : "" });
    const linksTitle = el("h2", { class: "section-title", text: t("home.quickLinksTitle") });
    const linksGrid = quickLinksGrid(isRecruiter ? RECRUITER_LINKS() : CANDIDATE_LINKS());

    // Los accesos rápidos con el mismo ancho que el resumen o el panel de encima.
    const linksSection = el("div", { class: isRecruiter ? "home-dashboard" : "home-links" }, [linksTitle, linksGrid]);
    container.append(welcome, summarySlot, linksSection);

    try {
        const summary = isRecruiter ? await buildRecruiterDashboard(user.id) : await buildCandidateSummary();
        summarySlot.append(summary);
    } catch (error) {
        summarySlot.append(errorBanner(error.message));
    }
};
