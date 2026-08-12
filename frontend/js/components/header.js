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
    ["/calendar", t("nav.calendar")],
    ["/ai", t("nav.ai")]
];

export const initHeader = () => {
    const burger = document.querySelector(".burger");
    const drawer = document.getElementById("nav-drawer");
    const avatar = document.querySelector(".user-icon");

    const closeDrawer = () => drawer.classList.remove("open");

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
        drawer.classList.toggle("open");
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
        if (drawer.classList.contains("open")) {
            renderDrawer();
        }
    });
};
