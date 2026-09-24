import { el } from "./ui.js";
import { getCurrentUser } from "../api.js";
import { isAuthenticated, logout } from "../auth.js";
import { navigate } from "../router.js";
import { t, onLangChange } from "../i18n.js";

const candidateLinks = () => [
    ["/", t("nav.home")],
    ["/jobs", t("nav.jobsCandidate")],
    ["/applications", t("nav.applications")],
    ["/calendar", t("nav.calendar")],
    ["/profile", t("nav.profile")],
    ["/ai", t("nav.ai")]
];

const recruiterLinks = () => [
    ["/", t("nav.home")],
    ["/jobs", t("nav.jobsRecruiter")],
    ["/applicants", t("nav.applicants")],
    ["/calendar", t("nav.calendar")],
    ["/ai", t("nav.ai")]
];

export const initHeader = () => {
    const burger = document.querySelector(".burger");
    const drawer = document.getElementById("nav-drawer");
    const avatar = document.querySelector(".user-icon");

    // Cerrado, el drawer está fuera de la pantalla pero sus enlaces seguían
    // recibiendo el foco con el tabulador: inert los saca del orden de foco.
    const setOpen = (open) => {
        drawer.classList.toggle("open", open);
        drawer.inert = !open;
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? t("nav.menuClose") : t("nav.menuOpen"));
    };
    const closeDrawer = () => setOpen(false);

    // Nombres accesibles traducidos de los botones de la cabecera.
    const updateLabels = () => {
        burger.setAttribute("aria-label", drawer.classList.contains("open") ? t("nav.menuClose") : t("nav.menuOpen"));
        avatar.setAttribute("aria-label", isAuthenticated() ? t("nav.profile") : t("auth.loginTitle"));
        const skip = document.getElementById("skip-link");
        if (skip) skip.textContent = t("nav.skipToContent");
    };
    updateLabels();
    window.addEventListener("hashchange", updateLabels);

    document.getElementById("skip-link")?.addEventListener("click", () => {
        document.getElementById("main-content")?.focus();
    });

    // Escape cierra el menú y devuelve el foco al botón que lo abrió.
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && drawer.classList.contains("open")) {
            closeDrawer();
            burger.focus();
        }
    });

    const renderDrawer = () => {
        drawer.innerHTML = "";

        if (!isAuthenticated()) {
            drawer.append(el("p", { class: "drawer-hint", text: t("nav.drawerHint") }));
            return;
        }

        const user = getCurrentUser();
        const links = user.role === "recruiter" ? recruiterLinks() : candidateLinks();

        const list = el("nav", { class: "drawer-nav" }, links.map(([path, label]) =>
            el("a", {
                href: `#${path}`,
                text: label,
                onClick: () => closeDrawer()
            })
        ));

        drawer.append(
            el("p", { class: "drawer-user", text: `${user.email} (${user.role})` }),
            list,
            el("button", {
                class: "drawer-logout",
                type: "button",
                text: t("nav.logout"),
                onClick: () => {
                    logout();
                    closeDrawer();
                    navigate("/login");
                }
            })
        );
    };

    burger.addEventListener("click", () => {
        renderDrawer();
        const open = !drawer.classList.contains("open");
        setOpen(open);
        // Al abrir, el foco pasa al primer enlace del menú.
        if (open) drawer.querySelector("a, button")?.focus();
    });

    avatar.addEventListener("click", () => {
        if (isAuthenticated()) {
            navigate("/profile");
        } else {
            navigate("/login");
        }
    });

    window.addEventListener("hashchange", closeDrawer);

    // Si el drawer está abierto cuando se cambia de idioma, se redibuja al
    // instante; si está cerrado, ya se generará traducido la próxima vez
    // que se abra (renderDrawer se llama siempre al hacer click en burger).
    onLangChange(() => {
        updateLabels();
        if (drawer.classList.contains("open")) {
            renderDrawer();
        }
    });
};
