// Contenido de la Política de Privacidad mostrada en el registro (login.js).
// IMPORTANTE: esto es un BORRADOR orientativo redactado siguiendo el RGPD
// (UE) 2016/679 y la LOPDGDD española (Ley Orgánica 3/2018), pensado para
// una app en desarrollo -- no es asesoría legal. Antes de publicar la app
// debe revisarlo un abogado o un delegado de protección de datos.
//
// Solo hay contenido completo en es/en (ver docs/decisions.md, entrada 017,
// para el porqué). La estructura por secciones está pensada para poder añadir
// fr/it más adelante sin tocar el resto del código -- basta con añadir esas
// claves a este objeto.

export const PRIVACY_POLICY_CONTENT = {
    es: {
        title: "Política de Privacidad",
        updated: "Última actualización: agosto de 2026",
        sections: [
            {
                heading: "1. Responsable del tratamiento",
                body: "HireFlow es una aplicación en desarrollo para conectar personas candidatas con empresas. El responsable del tratamiento de los datos es el titular del proyecto HireFlow, contactable en privacy@hireflow.example (dirección de contacto provisional mientras la app está en desarrollo)."
            },
            {
                heading: "2. Qué datos recogemos",
                body: "Al registrarte: nombre, email y contraseña (guardada siempre cifrada, nunca en texto plano). De forma opcional, en tu perfil: sector, teléfono y ubicación. Nunca te pedimos datos bancarios, número de tarjeta ni otros datos especialmente sensibles (salud, ideología, etc.)."
            },
            {
                heading: "3. Para qué usamos tus datos",
                body: "Para crear y gestionar tu cuenta, mostrarte ofertas de empleo o candidatos según tu rol, gestionar tus postulaciones y entrevistas, y —solo con tu consentimiento expreso en cada postulación— compartir tu nombre, email y teléfono con la empresa a la que te postulas, para que pueda contactarte."
            },
            {
                heading: "4. Base legal",
                body: "La gestión de tu cuenta y del servicio se basa en la ejecución del contrato de uso que aceptas al registrarte (art. 6.1.b RGPD). Compartir tus datos de contacto con una empresa al postularte se basa en tu consentimiento explícito, que se solicita de forma individual en cada postulación y puedes denegar sin dejar de poder usar el resto de la app."
            },
            {
                heading: "5. Con quién compartimos tus datos",
                body: "Solo con la empresa a la que te postulas, y solo tu nombre, email y teléfono, y solo si has marcado la casilla de consentimiento al postularte. No vendemos ni cedemos tus datos a terceros con fines publicitarios ni de ningún otro tipo."
            },
            {
                heading: "6. Cuánto tiempo conservamos tus datos",
                body: "Mientras tu cuenta esté activa. Puedes eliminarla en cualquier momento desde tu perfil; al hacerlo se borran también tus postulaciones, notas y entrevistas asociadas."
            },
            {
                heading: "7. Tus derechos",
                body: "Puedes acceder a tus datos, rectificarlos, solicitar su supresión, oponerte a su tratamiento, pedir la limitación del tratamiento o la portabilidad de tus datos, escribiendo a privacy@hireflow.example o eliminando directamente tu cuenta desde la pantalla de perfil. Si consideras que no hemos atendido tu solicitud correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es)."
            },
            {
                heading: "8. Usuarios fuera de España",
                body: "Si accedes desde otro país, pueden aplicarte además derechos equivalentes bajo tu normativa local: el RGPD del Reino Unido y la guía de la ICO si accedes desde el Reino Unido, la Loi Informatique et Libertés y la CNIL si accedes desde Francia, o la CCPA/CPRA si accedes desde California (EE. UU.). Estamos revisando esta política para reflejar esas normativas con más detalle; mientras tanto, aplicamos siempre el nivel de protección más favorable para ti."
            },
            {
                heading: "9. Seguridad",
                body: "Las contraseñas se guardan cifradas (nunca en texto plano) y el acceso a la API requiere autenticación. En producción, todo el tráfico debe viajar cifrado (HTTPS)."
            },
            {
                heading: "10. Menores de edad",
                body: "HireFlow no está dirigida a menores de 16 años. Si detectamos una cuenta de una persona menor de esa edad, la eliminaremos."
            },
            {
                heading: "11. Cambios en esta política",
                body: "Si hacemos cambios importantes en esta política, te lo notificaremos la próxima vez que inicies sesión."
            }
        ],
        disclaimer: "Aviso: este es un borrador orientativo para una aplicación en desarrollo, no constituye asesoría legal. Antes de publicar la app, debe ser revisado por un profesional de protección de datos."
    },
    en: {
        title: "Privacy Policy",
        updated: "Last updated: August 2026",
        sections: [
            {
                heading: "1. Data controller",
                body: "HireFlow is an app in development that connects job candidates with employers. The data controller is the HireFlow project owner, reachable at privacy@hireflow.example (temporary contact address while the app is in development)."
            },
            {
                heading: "2. What data we collect",
                body: "When you register: name, email and password (always stored encrypted, never in plain text). Optionally, in your profile: sector, phone number and location. We will never ask you for bank details, card numbers or other especially sensitive data (health, beliefs, etc.)."
            },
            {
                heading: "3. What we use your data for",
                body: "To create and manage your account, show you job offers or candidates depending on your role, manage your applications and interviews, and — only with your explicit consent given on each application — share your name, email and phone number with the company you're applying to, so they can contact you."
            },
            {
                heading: "4. Legal basis",
                body: "Managing your account and the service is based on performance of the usage agreement you accept when registering (GDPR art. 6.1.b). Sharing your contact details with a company when you apply is based on your explicit consent, requested individually on each application, which you can decline without losing access to the rest of the app."
            },
            {
                heading: "5. Who we share your data with",
                body: "Only the company you apply to, and only your name, email and phone number, and only if you checked the consent box when applying. We do not sell or share your data with third parties for advertising or any other purpose."
            },
            {
                heading: "6. How long we keep your data",
                body: "For as long as your account is active. You can delete it at any time from your profile; doing so also deletes your applications, notes and associated interviews."
            },
            {
                heading: "7. Your rights",
                body: "You can access, rectify or request deletion of your data, object to its processing, or request restriction of processing or data portability, by writing to privacy@hireflow.example or by deleting your account directly from the profile screen. If you believe we haven't handled your request properly, you can file a complaint with your local data protection authority (in Spain, the AEPD at aepd.es)."
            },
            {
                heading: "8. Users outside Spain",
                body: "If you access from another country, equivalent rights under your local law may also apply to you: UK GDPR and ICO guidance if you're in the UK, the French Data Protection Act and CNIL if you're in France, or the CCPA/CPRA if you're in California (US). We're working on expanding this policy to cover those frameworks in more detail; in the meantime, we always apply whichever level of protection is more favorable to you."
            },
            {
                heading: "9. Security",
                body: "Passwords are stored encrypted (never in plain text) and API access requires authentication. In production, all traffic must travel encrypted (HTTPS)."
            },
            {
                heading: "10. Minors",
                body: "HireFlow is not directed at anyone under 16. If we become aware of an account belonging to someone under that age, we will delete it."
            },
            {
                heading: "11. Changes to this policy",
                body: "If we make significant changes to this policy, we'll notify you the next time you log in."
            }
        ],
        disclaimer: "Notice: this is an informal draft for an app still in development, not legal advice. It must be reviewed by a data protection professional before the app is published."
    }
};

export const getPrivacyPolicy = (lang) => PRIVACY_POLICY_CONTENT[lang] || PRIVACY_POLICY_CONTENT.es;
