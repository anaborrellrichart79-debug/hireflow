// Página pública "Cómo eliminar tu cuenta" (delete-account.html), para el
// enlace que pide Google Play. Ver docs/decisions.md, entrada 042.
import { DELETE_ACCOUNT_CONTENT } from "./deleteAccountContent.js";
import { node, pickLang, setupPublicPage } from "./publicPage.js";

const AVAILABLE = Object.keys(DELETE_ACCOUNT_CONTENT);
const lang = pickLang(AVAILABLE);
const page = DELETE_ACCOUNT_CONTENT[lang];
const { appendBackButton } = setupPublicPage({ lang, available: AVAILABLE, title: page.title });

const list = (tag, items) => {
    const element = node(tag);
    items.forEach((item) => element.append(node("li", item)));
    return element;
};

const content = document.getElementById("privacy-content");
content.innerHTML = "";
content.append(node("h1", page.title), node("p", page.intro));
page.sections.forEach((section) => {
    content.append(node("h2", section.heading));
    if (section.steps) content.append(list("ol", section.steps));
    if (section.items) content.append(list("ul", section.items));
    if (section.body) content.append(node("p", section.body));
});

const privacyLink = node("a", page.privacyLink);
privacyLink.href = `privacy.html?lang=${lang}`;
content.append(node("p", "", "privacy-related"));
content.lastChild.append(privacyLink);
appendBackButton(content);
