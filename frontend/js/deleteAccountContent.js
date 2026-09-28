// Página pública "Cómo eliminar tu cuenta" (delete-account.html). Google Play
// exige un enlace web para pedir el borrado de la cuenta sin tener que
// instalar la app. Las cuatro versiones tienen que decir lo mismo, y los
// nombres de pantallas y botones deben coincidir con los de i18n.js.
// Ver docs/decisions.md, entrada 042.
const EMAIL = "ana.borrell.richart79@gmail.com";

export const DELETE_ACCOUNT_CONTENT = {
    es: {
        title: "Cómo eliminar tu cuenta de HireFlow",
        intro: "Puedes eliminar tu cuenta y todos tus datos en cualquier momento. Tienes dos formas de hacerlo.",
        sections: [
            {
                heading: "1. Desde la app (inmediato)",
                steps: [
                    "Inicia sesión en HireFlow.",
                    "Pulsa el icono de usuario, arriba a la izquierda, para abrir «Mi perfil».",
                    "Al final de la pantalla, pulsa «Eliminar mi cuenta».",
                    "Escribe tu contraseña para confirmarlo. La cuenta se borra en ese momento."
                ]
            },
            {
                heading: "2. Sin entrar en la app",
                body: `Escribe a ${EMAIL} desde el email con el que te registraste, con el asunto «Eliminar mi cuenta de HireFlow». Para proteger tu cuenta, solo atendemos solicitudes enviadas desde ese email. Eliminaremos la cuenta y te lo confirmaremos en un plazo máximo de 30 días.`
            },
            {
                heading: "Qué se elimina",
                items: [
                    "Si buscas empleo: tu cuenta, tu perfil, tu CV, tus postulaciones (con tus consentimientos y tu firma), tus notas y tus entrevistas.",
                    "Si publicas ofertas: tu cuenta, tus empresas y tus ofertas, junto con las postulaciones y entrevistas que hayan recibido."
                ]
            },
            {
                heading: "Qué se conserva",
                body: "Nada. Los datos se borran de forma definitiva y no guardamos copias. Si una empresa ya había guardado tus datos de contacto fuera de HireFlow, pídele directamente que los borre."
            }
        ],
        privacyLink: "Consulta la Política de Privacidad"
    },
    en: {
        title: "How to delete your HireFlow account",
        intro: "You can delete your account and all your data at any time. There are two ways to do it.",
        sections: [
            {
                heading: "1. From the app (immediate)",
                steps: [
                    "Log in to HireFlow.",
                    "Tap the user icon, top left, to open “My profile”.",
                    "At the bottom of the screen, tap “Delete my account”.",
                    "Type your password to confirm. The account is deleted right away."
                ]
            },
            {
                heading: "2. Without opening the app",
                body: `Write to ${EMAIL} from the email you signed up with, with the subject “Delete my HireFlow account”. To protect your account, we only handle requests sent from that email. We will delete the account and confirm it within 30 days at the latest.`
            },
            {
                heading: "What is deleted",
                items: [
                    "If you're looking for a job: your account, profile, CV, applications (with your consents and signature), notes and interviews.",
                    "If you post job offers: your account, companies and job offers, along with the applications and interviews they received."
                ]
            },
            {
                heading: "What is kept",
                body: "Nothing. The data is permanently deleted and we keep no copies. If a company had already saved your contact details outside HireFlow, ask them directly to delete them."
            }
        ],
        privacyLink: "Read the Privacy Policy"
    },
    fr: {
        title: "Comment supprimer votre compte HireFlow",
        intro: "Vous pouvez supprimer votre compte et toutes vos données à tout moment. Vous avez deux façons de le faire.",
        sections: [
            {
                heading: "1. Depuis l'application (immédiat)",
                steps: [
                    "Connectez-vous à HireFlow.",
                    "Touchez l'icône d'utilisateur, en haut à gauche, pour ouvrir « Mon profil ».",
                    "En bas de l'écran, touchez « Supprimer mon compte ».",
                    "Saisissez votre mot de passe pour confirmer. Le compte est supprimé immédiatement."
                ]
            },
            {
                heading: "2. Sans ouvrir l'application",
                body: `Écrivez à ${EMAIL} depuis l'email avec lequel vous vous êtes inscrit, avec l'objet « Supprimer mon compte HireFlow ». Pour protéger votre compte, nous ne traitons que les demandes envoyées depuis cet email. Nous supprimerons le compte et vous le confirmerons dans un délai maximum de 30 jours.`
            },
            {
                heading: "Ce qui est supprimé",
                items: [
                    "Si vous cherchez un emploi : votre compte, votre profil, votre CV, vos candidatures (avec vos consentements et votre signature), vos notes et vos entretiens.",
                    "Si vous publiez des offres : votre compte, vos entreprises et vos offres, ainsi que les candidatures et entretiens reçus."
                ]
            },
            {
                heading: "Ce qui est conservé",
                body: "Rien. Les données sont supprimées définitivement et nous n'en gardons aucune copie. Si une entreprise avait déjà enregistré vos coordonnées en dehors de HireFlow, demandez-lui directement de les supprimer."
            }
        ],
        privacyLink: "Consulter la Politique de Confidentialité"
    },
    it: {
        title: "Come eliminare il tuo account HireFlow",
        intro: "Puoi eliminare il tuo account e tutti i tuoi dati in qualsiasi momento. Hai due modi per farlo.",
        sections: [
            {
                heading: "1. Dall'app (immediato)",
                steps: [
                    "Accedi a HireFlow.",
                    "Tocca l'icona utente, in alto a sinistra, per aprire «Il mio profilo».",
                    "In fondo alla schermata, tocca «Elimina il mio account».",
                    "Scrivi la tua password per confermare. L'account viene eliminato subito."
                ]
            },
            {
                heading: "2. Senza aprire l'app",
                body: `Scrivi a ${EMAIL} dall'email con cui ti sei registrato, con oggetto «Eliminare il mio account HireFlow». Per proteggere il tuo account, gestiamo solo le richieste inviate da quell'email. Elimineremo l'account e te lo confermeremo entro 30 giorni al massimo.`
            },
            {
                heading: "Cosa viene eliminato",
                items: [
                    "Se cerchi lavoro: il tuo account, il tuo profilo, il tuo CV, le tue candidature (con i tuoi consensi e la tua firma), le tue note e i tuoi colloqui.",
                    "Se pubblichi offerte: il tuo account, le tue aziende e le tue offerte, insieme alle candidature e ai colloqui ricevuti."
                ]
            },
            {
                heading: "Cosa viene conservato",
                body: "Niente. I dati vengono eliminati definitivamente e non ne conserviamo copie. Se un'azienda aveva già salvato i tuoi dati di contatto fuori da HireFlow, chiedile direttamente di cancellarli."
            }
        ],
        privacyLink: "Leggi l'Informativa sulla Privacy"
    }
};
