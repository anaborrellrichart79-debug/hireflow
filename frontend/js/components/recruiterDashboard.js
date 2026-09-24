import { el } from "./ui.js";
import { apiFetch } from "../api.js";
import { navigate } from "../router.js";
import { t, getLang } from "../i18n.js";
import { setApplicantsJobFilter } from "../screens/applicants.js";

// Panel de la empresa en Inicio (ver docs/decisions.md, entrada 032).
// Todo se calcula en el cliente con lo que ya dan /jobs, /applications/recruiter
// y /interviews: no hace falta ningún endpoint nuevo.
//
// Forma elegida siguiendo la guía de visualización de datos:
// - los números clave son tarjetas de métricas, no gráficos;
// - el avance del proceso son categorías ordenadas de una sola serie:
//   barras horizontales de un solo color (validado: #c47a28 pasa las
//   comprobaciones de color y 3:1 sobre blanco), con el valor en la punta;
// - el detalle por oferta es una tabla, que hace a la vez de vista en tabla.

const percent = (value, total) =>
    total === 0 ? "—" : new Intl.NumberFormat(getLang(), { style: "percent", maximumFractionDigits: 0 }).format(value / total);

const startOfWeek = (date) => {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
};

const parseDate = (value) => new Date(String(value).replace(" ", "T"));

const statTile = (value, label) =>
    el("div", { class: "stat-card" }, [
        el("span", { class: "stat-value", text: String(value) }),
        el("span", { class: "stat-label", text: label })
    ]);

// Una fila del embudo: etiqueta, barra (pista clara + relleno) y valor en la
// punta. Con foco o al pasar el ratón, un tooltip con "3 de 5 (60 %)"; el
// mismo texto va en aria-label, así el tooltip nunca es la única vía.
const funnelRow = (label, value, total) => {
    const detail = `${value} ${t("dash.ofTotal")} ${total} (${percent(value, total)})`;
    const fill = el("span", { class: "funnel-fill" });
    fill.style.width = total === 0 ? "0%" : `${(value / total) * 100}%`;
    return el("div", { class: "funnel-row", tabindex: "0", "aria-label": `${label}: ${detail}` }, [
        el("span", { class: "funnel-label", text: label }),
        el("span", { class: "funnel-track" }, [fill]),
        el("span", { class: "funnel-value", text: String(value) }),
        el("span", { class: "funnel-tooltip", role: "tooltip", text: detail })
    ]);
};

const funnelCard = (applications) => {
    const total = applications.length;
    const reachedInterview = applications.filter((app) => app.status === "interview" || app.status === "offer").length;
    const withOffer = applications.filter((app) => app.status === "offer").length;
    const rejected = applications.filter((app) => app.status === "rejected").length;

    return el("section", { class: "dash-card", "aria-labelledby": "dash-funnel-title" }, [
        el("h3", { id: "dash-funnel-title", class: "dash-card-title", text: t("dash.funnelTitle") }),
        funnelRow(t("dash.funnelApplied"), total, total),
        funnelRow(t("dash.funnelInterview"), reachedInterview, total),
        funnelRow(t("dash.funnelOffer"), withOffer, total),
        rejected > 0 ? el("p", { class: "dash-note", text: `${rejected} ${t("dash.rejectedNote")}` }) : null
    ]);
};

const byOfferCard = (ownJobs, applications) => {
    const rows = ownJobs.map((job) => {
        const apps = applications.filter((app) => app.job_offer_id === job.id);
        return {
            job,
            total: apps.length,
            interview: apps.filter((app) => app.status === "interview" || app.status === "offer").length,
            offer: apps.filter((app) => app.status === "offer").length
        };
    }).sort((a, b) => b.total - a.total || a.job.title.localeCompare(b.job.title));

    const max = Math.max(1, ...rows.map((row) => row.total));

    const miniBar = (value) => {
        const fill = el("span", { class: "mini-bar-fill" });
        fill.style.width = `${(value / max) * 100}%`;
        return el("span", { class: "mini-bar", "aria-hidden": "true" }, [fill]);
    };

    return el("section", { class: "dash-card dash-card--wide", "aria-labelledby": "dash-offers-title" }, [
        el("h3", { id: "dash-offers-title", class: "dash-card-title", text: t("dash.byOfferTitle") }),
        el("div", { class: "dash-table-wrap" }, [
            el("table", { class: "dash-table" }, [
                el("thead", {}, [el("tr", {}, [
                    el("th", { scope: "col", text: t("dash.colOffer") }),
                    el("th", { scope: "col", text: t("dash.colApplicants") }),
                    el("th", { scope: "col", class: "num", text: t("dash.colInterview") }),
                    el("th", { scope: "col", class: "num", text: t("dash.colOffers") })
                ])]),
                el("tbody", {}, rows.map((row) => el("tr", {}, [
                    el("th", { scope: "row" }, [
                        el("button", {
                            type: "button",
                            class: "link-button",
                            text: row.job.title,
                            onClick: () => { setApplicantsJobFilter(row.job.id); navigate("/applicants"); }
                        })
                    ]),
                    el("td", {}, [el("span", { class: "mini-bar-cell" }, [miniBar(row.total), el("span", { class: "num", text: String(row.total) })])]),
                    el("td", { class: "num", text: String(row.interview) }),
                    el("td", { class: "num", text: String(row.offer) })
                ])))
            ])
        ])
    ]);
};

const upcomingCard = (interviews) => {
    const now = new Date();
    const upcoming = interviews
        .map((interview) => ({ interview, when: parseDate(interview.scheduled_date) }))
        .filter(({ when }) => when >= now)
        .sort((a, b) => a.when - b.when)
        .slice(0, 3);

    const format = (date) => date.toLocaleString(getLang(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

    return el("section", { class: "dash-card", "aria-labelledby": "dash-upcoming-title" }, [
        el("h3", { id: "dash-upcoming-title", class: "dash-card-title", text: t("dash.upcomingTitle") }),
        upcoming.length === 0
            ? el("p", { class: "dash-note", text: t("dash.noUpcoming") })
            : el("ul", { class: "dash-upcoming" }, upcoming.map(({ interview, when }) =>
                el("li", {}, [
                    el("strong", { text: format(when) }),
                    el("span", { text: [interview.candidate_name, interview.job_title].filter(Boolean).join(" · ") })
                ])
            )),
        el("button", { type: "button", class: "link-button", text: t("dash.seeCalendar"), onClick: () => navigate("/calendar") })
    ]);
};

export const buildRecruiterDashboard = async (userId) => {
    const [jobs, applications, interviews] = await Promise.all([
        apiFetch("/jobs"),
        apiFetch("/applications/recruiter"),
        apiFetch("/interviews")
    ]);
    const ownJobs = jobs.filter((job) => job.created_by_user === userId);

    if (ownJobs.length === 0) {
        return el("div", { class: "dash-empty" }, [
            el("p", { text: t("dash.noJobsYet") }),
            el("button", { type: "button", class: "primary-button", text: t("jobs.newOfferButton"), onClick: () => navigate("/jobs/new") })
        ]);
    }

    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const interviewsThisWeek = interviews.filter((interview) => {
        const when = parseDate(interview.scheduled_date);
        return when >= weekStart && when < weekEnd;
    }).length;
    const reachedInterview = applications.filter((app) => app.status === "interview" || app.status === "offer").length;

    return el("div", { class: "dash" }, [
        el("div", { class: "stat-row dash-kpis" }, [
            statTile(ownJobs.length, t("home.summaryJobsPublished")),
            statTile(applications.length, t("dash.kpiApplicants")),
            statTile(interviewsThisWeek, t("dash.kpiInterviewsWeek")),
            statTile(percent(reachedInterview, applications.length), t("dash.kpiInterviewRate"))
        ]),
        el("div", { class: "dash-grid" }, [
            funnelCard(applications),
            upcomingCard(interviews),
            byOfferCard(ownJobs, applications)
        ])
    ]);
};
