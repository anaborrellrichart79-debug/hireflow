import { isAuthenticated } from "./auth.js";

const routes = [];
let mainContainer = null;
let onNavigate = null;

const toRegex = (pattern) => {
    const paramNames = [];
    const regexSource = pattern
        .split("/")
        .map((segment) => {
            if (segment.startsWith(":")) {
                paramNames.push(segment.slice(1));
                return "([^/]+)";
            }
            return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/");
    return { regex: new RegExp(`^${regexSource}$`), paramNames };
};

export const registerRoute = (pattern, { render, public: isPublic = false }) => {
    const { regex, paramNames } = toRegex(pattern);
    routes.push({ pattern, regex, paramNames, render, public: isPublic });
};

export const navigate = (path) => {
    window.location.hash = path;
};

const currentPath = () => {
    const hash = window.location.hash.replace(/^#/, "");
    return hash || "/";
};

const matchRoute = (path) => {
    for (const route of routes) {
        const match = path.match(route.regex);
        if (match) {
            const params = {};
            route.paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });
            return { route, params };
        }
    }
    return null;
};

const runRoute = async () => {
    const path = currentPath();
    const matched = matchRoute(path) || matchRoute("/404");

    if (!matched) {
        return;
    }

    const { route, params } = matched;

    if (!route.public && !isAuthenticated()) {
        window.location.hash = "/login";
        return;
    }

    mainContainer.innerHTML = "";
    if (onNavigate) {
        onNavigate(path);
    }

    try {
        await route.render(mainContainer, params);
    } catch (error) {
        mainContainer.innerHTML = `<p class="error-text">Error al cargar la pantalla: ${error.message}</p>`;
    }
};

export const initRouter = (container, { onRouteChange } = {}) => {
    mainContainer = container;
    onNavigate = onRouteChange || null;
    window.addEventListener("hashchange", runRoute);
    runRoute();
};
