// Página pública de la Política de Privacidad (privacy.html). Sin sesión ni
// router: se puede abrir desde cualquier sitio (Google Play, un email...) y
// también se publica sola en GitHub Pages. Ver docs/decisions.md, entrada 035.
import { PRIVACY_POLICY_CONTENT, getPrivacyPolicy } from "./privacyPolicyContent.js";
import { node, pickLang, setupPublicPage } from "./publicPage.js";

const AVAILABLE = Object.keys(PRIVACY_POLICY_CONTENT); // es, en, fr, it
// Enlace a la página de eliminar la cuenta, al final (entrada 042)
const DELETE_LINK = {
    es: "¿Quieres eliminar tu cuenta? Te explicamos cómo",
    en: "Want to delete your account? Here's how",
    fr: "Vous voulez supprimer votre compte ? Voici comment",
    it: "Vuoi eliminare il tuo account? Ecco come"
};

const lang = pickLang(AVAILABLE);
const policy = getPrivacyPolicy(lang);
const { appendBackButton } = setupPublicPage({ lang, available: AVAILABLE, title: policy.title });

const deleteLink = node("a", DELETE_LINK[lang]);
deleteLink.href = `delete-account.html?lang=${lang}`;

const content = document.getElementById("privacy-content");
content.innerHTML = "";
content.append(
    node("h1", policy.title),
    node("p", policy.updated, "privacy-updated"),
    ...policy.sections.flatMap((section) => [node("h2", section.heading), node("p", section.body)]),
    node("p", policy.disclaimer, "privacy-disclaimer")
);
content.append(node("p", "", "privacy-related"));
content.lastChild.append(deleteLink);
// Al final del texto también, que es donde llega quien lo ha leído entero
appendBackButton(content);
