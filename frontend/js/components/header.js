import { el } from "./ui.js";
import { getCurrentUser } from "../api.js";
import { isAuthenticated, logout } from "../auth.js";
import { navigate } from "../router.js";

const CANDIDATE_LINKS = [
    ["/", "Inicio"],
    ["/jobs", "Ofertas"],
    ["/applications", "Mis postulaciones"],
    ["/calendar", "Calendario"],
    ["/profile", "Mi perfil"],
    ["/ai", "Asistente IA"]
];

const RECRUITER_LINKS = [
    ["/", "Inicio"],
    ["/jobs", "Mis ofertas"],
    ["/calendar", "Calendario"],
    ["/ai", "Asistente IA"]
];

export const initHeader = () => {
    const burger = document.querySelector(".burger");
    const drawer = document.getElementById("nav-drawer");
    const avatar = document.querySelector(".user-icon");

    const closeDrawer = () => drawer.classList.remove("open");

    const renderDrawer = () => {
        drawer.innerHTML = "";

        if (!isAuthenticated()) {
            drawer.append(el("p", { class: "drawer-hint", text: "Inicia sesión para ver el menú" }));
            return;
        }

        const user = getCurrentUser();
        const links = user.role === "recruiter" ? RECRUITER_LINKS : CANDIDATE_LINKS;

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
                text: "Cerrar sesión",
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
};
