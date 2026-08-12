import { registerRoute, initRouter } from "./router.js";
import { initHeader } from "./components/header.js";
import { el } from "./components/ui.js";

import * as loginScreen from "./screens/login.js";
import * as homeScreen from "./screens/home.js";
import * as jobsScreen from "./screens/jobs.js";
import * as jobFormScreen from "./screens/jobForm.js";
import * as applicationsScreen from "./screens/applications.js";
import * as profileFormScreen from "./screens/profileForm.js";
import * as calendarScreen from "./screens/calendar.js";
import * as aiScreen from "./screens/ai.js";

registerRoute("/login", { render: loginScreen.render, public: true });
registerRoute("/", { render: homeScreen.render });
registerRoute("/jobs", { render: jobsScreen.render });
registerRoute("/jobs/new", { render: jobFormScreen.render });
registerRoute("/jobs/edit/:id", { render: jobFormScreen.render });
registerRoute("/applications", { render: applicationsScreen.render });
registerRoute("/profile", { render: profileFormScreen.render });
registerRoute("/calendar", { render: calendarScreen.render });
registerRoute("/ai", { render: aiScreen.render });
registerRoute("/404", {
    render: (container) => container.append(el("p", { text: "Pantalla no encontrada." })),
    public: true
});

const mainContainer = document.querySelector(".main-container");
initHeader();
initRouter(mainContainer);
