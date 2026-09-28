// Mensajes que devuelve la API, en los 4 idiomas de la app (ver
// docs/decisions.md, entrada 038). El español es la referencia: si falta una
// clave en otro idioma se usa la española. Los {marcadores} se sustituyen
// al traducir (ver i18n/index.js).
//
// Los mensajes de validación siguen el formato "Campo: problema" para no
// tener que concordar género y número con cada campo en cada idioma.

export const MESSAGES = {
    es: {
        // --- Genéricos ---
        "common.noValidFields": "Ningún campo válido para actualizar",
        "errors.duplicate": "El valor ya existe (debe ser único)",
        "errors.invalidReference": "Referencia inválida: uno de los recursos relacionados no existe",
        "errors.internal": "Error interno del servidor",
        "errors.routeNotFound": "Ruta no encontrada: {method} {url}",
        "errors.invalidJson": "El cuerpo de la petición no es un JSON válido",
        "validation.failed": "Datos de entrada no válidos",

        // --- Autenticación y permisos ---
        "auth.noToken": "No se proporcionó un token de autenticación",
        "auth.sessionExpired": "La sesión ha caducado. Vuelve a iniciar sesión.",
        "auth.invalidToken": "Token de autenticación no válido",
        "auth.forbidden": "No tienes permisos para realizar esta acción",
        "auth.tooManyAttempts": "Demasiados intentos de inicio de sesión. Vuelve a intentarlo en unos minutos.",
        "auth.invalidCredentials": "Email o contraseña incorrectos",
        "auth.loggedIn": "Sesión iniciada",

        // --- Usuarios y CV ---
        "users.emailTaken": "El email ya está registrado",
        "users.notFound": "Usuario no encontrado",
        "users.profileUpdated": "Perfil actualizado correctamente",
        "users.accountDeleted": "Cuenta eliminada correctamente",
        "cv.noValidFields": "Ningún campo válido para guardar",
        "cv.notFound": "Todavía no has creado tu CV",
        "cv.deleted": "CV eliminado correctamente",

        // --- Postulaciones ---
        "applications.alreadyApplied": "Ya te has postulado a esta oferta",
        "applications.notFound": "Postulación no encontrada",
        "applications.statusUpdated": "Estado actualizado. El candidato lo verá reflejado en sus postulaciones.",
        "applications.seenMarked": "Actualizaciones marcadas como vistas",
        "applications.managedByCompany": "El estado de una postulación a una oferta lo gestiona la empresa. Puedes retirar la postulación si ya no te interesa.",
        "applications.updated": "Postulación actualizada correctamente",
        "applications.consentMissing": "Envía consent_contact y/o consent_cv",
        "applications.deleted": "Postulación eliminada correctamente",

        // --- Calendario ---
        "calendar.invalidRelated": "La postulación indicada (related_application) no existe o no te pertenece",
        "calendar.notFound": "Evento no encontrado",
        "calendar.updated": "Evento actualizado correctamente",
        "calendar.deleted": "Evento eliminado correctamente",

        // --- Empresas ---
        "companies.emailTaken": "El email de la empresa ya está registrado",
        "companies.notFound": "Empresa no encontrada",
        "companies.updated": "Empresa actualizada correctamente",
        "companies.hasOffers": "La empresa tiene ofertas publicadas. Bórralas antes de eliminar la empresa.",
        "companies.deleted": "Empresa eliminada correctamente",

        // --- Entrevistas ---
        "interviews.invalidType": "El tipo de entrevista indicado (interview_type_id) no existe",
        "interviews.notFound": "Entrevista no encontrada",
        "interviews.updated": "Entrevista actualizada correctamente",
        "interviews.deleted": "Entrevista eliminada correctamente",

        // --- Ofertas ---
        "jobs.invalidCompany": "La empresa indicada (company_id) no existe o no es tuya",
        "jobs.notFound": "Oferta no encontrada",
        "jobs.notFoundOrCompany": "Oferta no encontrada, o la empresa indicada no es tuya",
        "jobs.updated": "Oferta actualizada correctamente",
        "jobs.deleted": "Oferta eliminada correctamente",

        // --- Asistente IA ---
        "ai.skillsMissing": "Envía skills en el body o guárdalas antes en tu CV",

        // --- Validación: plantillas por campo ---
        "v.required": "{field}: este campo es obligatorio",
        "v.notEmpty": "{field}: no puede estar vacío",
        "v.invalid": "{field}: el valor no es válido",
        "v.int": "{field}: debe ser un número entero válido",
        "v.intRange": "{field}: debe ser un número entero entre {min} y {max}",
        "v.string": "{field}: debe ser texto",
        "v.boolean": "{field}: debe ser true o false",
        "v.maxLength": "{field}: no puede superar {max} caracteres",
        "v.oneOf": "{field}: debe ser uno de estos valores: {values}",
        "v.email": "{field}: no es un email válido",
        "v.url": "{field}: no es una URL válida",
        "v.httpUrl": "{field}: debe ser una URL válida que empiece por http:// o https://",
        "v.datetime": "{field}: debe tener el formato AAAA-MM-DD HH:mm:ss",
        "v.arrayMin": "{field}: debe ser una lista con al menos {min} elemento",
        "v.arrayItemText": "{field}: cada elemento debe ser un texto no vacío",

        // --- Validación: mensajes completos ---
        "v.consentRequired": "Debes aceptar compartir tus datos de contacto con la empresa para postularte",
        "v.signatureRequired": "Debes escribir tu nombre para firmar la postulación",
        "v.passwordLength": "La contraseña debe tener entre 8 y 72 caracteres",
        "v.passwordLetter": "La contraseña debe incluir al menos una letra",
        "v.passwordNumber": "La contraseña debe incluir al menos un número",
        "v.termsRequired": "Debes aceptar la política de privacidad para registrarte"
    },

    en: {
        "common.noValidFields": "No valid fields to update",
        "errors.duplicate": "That value already exists (it must be unique)",
        "errors.invalidReference": "Invalid reference: one of the related resources doesn't exist",
        "errors.internal": "Internal server error",
        "errors.routeNotFound": "Route not found: {method} {url}",
        "errors.invalidJson": "The request body is not valid JSON",
        "validation.failed": "Invalid input data",

        "auth.noToken": "No authentication token was provided",
        "auth.sessionExpired": "Your session has expired. Please log in again.",
        "auth.invalidToken": "Invalid authentication token",
        "auth.forbidden": "You don't have permission to do this",
        "auth.tooManyAttempts": "Too many login attempts. Please try again in a few minutes.",
        "auth.invalidCredentials": "Incorrect email or password",
        "auth.loggedIn": "Logged in",

        "users.emailTaken": "That email is already registered",
        "users.notFound": "User not found",
        "users.profileUpdated": "Profile updated successfully",
        "users.accountDeleted": "Account deleted successfully",
        "cv.noValidFields": "No valid fields to save",
        "cv.notFound": "You haven't created your CV yet",
        "cv.deleted": "CV deleted successfully",

        "applications.alreadyApplied": "You have already applied to this job offer",
        "applications.notFound": "Application not found",
        "applications.statusUpdated": "Status updated. The candidate will see it in their applications.",
        "applications.seenMarked": "Updates marked as seen",
        "applications.managedByCompany": "The status of an application to a job offer is managed by the company. You can withdraw the application if you're no longer interested.",
        "applications.updated": "Application updated successfully",
        "applications.consentMissing": "Send consent_contact and/or consent_cv",
        "applications.deleted": "Application deleted successfully",

        "calendar.invalidRelated": "The given application (related_application) doesn't exist or isn't yours",
        "calendar.notFound": "Event not found",
        "calendar.updated": "Event updated successfully",
        "calendar.deleted": "Event deleted successfully",

        "companies.emailTaken": "That company email is already registered",
        "companies.notFound": "Company not found",
        "companies.updated": "Company updated successfully",
        "companies.hasOffers": "The company has published job offers. Delete them before deleting the company.",
        "companies.deleted": "Company deleted successfully",

        "interviews.invalidType": "The given interview type (interview_type_id) doesn't exist",
        "interviews.notFound": "Interview not found",
        "interviews.updated": "Interview updated successfully",
        "interviews.deleted": "Interview deleted successfully",

        "jobs.invalidCompany": "The given company (company_id) doesn't exist or isn't yours",
        "jobs.notFound": "Job offer not found",
        "jobs.notFoundOrCompany": "Job offer not found, or the given company isn't yours",
        "jobs.updated": "Job offer updated successfully",
        "jobs.deleted": "Job offer deleted successfully",

        "ai.skillsMissing": "Send skills in the body or save them in your CV first",

        "v.required": "{field}: this field is required",
        "v.notEmpty": "{field}: cannot be empty",
        "v.invalid": "{field}: the value is not valid",
        "v.int": "{field}: must be a valid whole number",
        "v.intRange": "{field}: must be a whole number between {min} and {max}",
        "v.string": "{field}: must be text",
        "v.boolean": "{field}: must be true or false",
        "v.maxLength": "{field}: cannot be longer than {max} characters",
        "v.oneOf": "{field}: must be one of these values: {values}",
        "v.email": "{field}: is not a valid email",
        "v.url": "{field}: is not a valid URL",
        "v.httpUrl": "{field}: must be a valid URL starting with http:// or https://",
        "v.datetime": "{field}: must use the format YYYY-MM-DD HH:mm:ss",
        "v.arrayMin": "{field}: must be a list with at least {min} item",
        "v.arrayItemText": "{field}: each item must be non-empty text",

        "v.consentRequired": "You must agree to share your contact details with the company to apply",
        "v.signatureRequired": "You must type your name to sign the application",
        "v.passwordLength": "The password must be between 8 and 72 characters long",
        "v.passwordLetter": "The password must include at least one letter",
        "v.passwordNumber": "The password must include at least one number",
        "v.termsRequired": "You must accept the privacy policy to sign up"
    },

    fr: {
        "common.noValidFields": "Aucun champ valide à mettre à jour",
        "errors.duplicate": "Cette valeur existe déjà (elle doit être unique)",
        "errors.invalidReference": "Référence invalide : l'une des ressources liées n'existe pas",
        "errors.internal": "Erreur interne du serveur",
        "errors.routeNotFound": "Route introuvable : {method} {url}",
        "errors.invalidJson": "Le corps de la requête n'est pas un JSON valide",
        "validation.failed": "Données saisies non valides",

        "auth.noToken": "Aucun jeton d'authentification n'a été fourni",
        "auth.sessionExpired": "Votre session a expiré. Veuillez vous reconnecter.",
        "auth.invalidToken": "Jeton d'authentification non valide",
        "auth.forbidden": "Vous n'avez pas l'autorisation d'effectuer cette action",
        "auth.tooManyAttempts": "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
        "auth.invalidCredentials": "Email ou mot de passe incorrect",
        "auth.loggedIn": "Connexion réussie",

        "users.emailTaken": "Cet email est déjà enregistré",
        "users.notFound": "Utilisateur introuvable",
        "users.profileUpdated": "Profil mis à jour avec succès",
        "users.accountDeleted": "Compte supprimé avec succès",
        "cv.noValidFields": "Aucun champ valide à enregistrer",
        "cv.notFound": "Vous n'avez pas encore créé votre CV",
        "cv.deleted": "CV supprimé avec succès",

        "applications.alreadyApplied": "Vous avez déjà postulé à cette offre",
        "applications.notFound": "Candidature introuvable",
        "applications.statusUpdated": "Statut mis à jour. Le candidat le verra dans ses candidatures.",
        "applications.seenMarked": "Mises à jour marquées comme vues",
        "applications.managedByCompany": "Le statut d'une candidature à une offre est géré par l'entreprise. Vous pouvez retirer la candidature si elle ne vous intéresse plus.",
        "applications.updated": "Candidature mise à jour avec succès",
        "applications.consentMissing": "Envoyez consent_contact et/ou consent_cv",
        "applications.deleted": "Candidature supprimée avec succès",

        "calendar.invalidRelated": "La candidature indiquée (related_application) n'existe pas ou ne vous appartient pas",
        "calendar.notFound": "Événement introuvable",
        "calendar.updated": "Événement mis à jour avec succès",
        "calendar.deleted": "Événement supprimé avec succès",

        "companies.emailTaken": "L'email de l'entreprise est déjà enregistré",
        "companies.notFound": "Entreprise introuvable",
        "companies.updated": "Entreprise mise à jour avec succès",
        "companies.hasOffers": "L'entreprise a des offres publiées. Supprimez-les avant de supprimer l'entreprise.",
        "companies.deleted": "Entreprise supprimée avec succès",

        "interviews.invalidType": "Le type d'entretien indiqué (interview_type_id) n'existe pas",
        "interviews.notFound": "Entretien introuvable",
        "interviews.updated": "Entretien mis à jour avec succès",
        "interviews.deleted": "Entretien supprimé avec succès",

        "jobs.invalidCompany": "L'entreprise indiquée (company_id) n'existe pas ou n'est pas la vôtre",
        "jobs.notFound": "Offre introuvable",
        "jobs.notFoundOrCompany": "Offre introuvable, ou l'entreprise indiquée n'est pas la vôtre",
        "jobs.updated": "Offre mise à jour avec succès",
        "jobs.deleted": "Offre supprimée avec succès",

        "ai.skillsMissing": "Envoyez skills dans le corps de la requête ou enregistrez-les d'abord dans votre CV",

        "v.required": "{field} : ce champ est obligatoire",
        "v.notEmpty": "{field} : ne peut pas être vide",
        "v.invalid": "{field} : la valeur n'est pas valide",
        "v.int": "{field} : doit être un nombre entier valide",
        "v.intRange": "{field} : doit être un nombre entier entre {min} et {max}",
        "v.string": "{field} : doit être du texte",
        "v.boolean": "{field} : doit être true ou false",
        "v.maxLength": "{field} : ne peut pas dépasser {max} caractères",
        "v.oneOf": "{field} : doit être l'une de ces valeurs : {values}",
        "v.email": "{field} : n'est pas un email valide",
        "v.url": "{field} : n'est pas une URL valide",
        "v.httpUrl": "{field} : doit être une URL valide commençant par http:// ou https://",
        "v.datetime": "{field} : doit respecter le format AAAA-MM-JJ HH:mm:ss",
        "v.arrayMin": "{field} : doit être une liste d'au moins {min} élément",
        "v.arrayItemText": "{field} : chaque élément doit être un texte non vide",

        "v.consentRequired": "Vous devez accepter de partager vos coordonnées avec l'entreprise pour postuler",
        "v.signatureRequired": "Vous devez écrire votre nom pour signer la candidature",
        "v.passwordLength": "Le mot de passe doit contenir entre 8 et 72 caractères",
        "v.passwordLetter": "Le mot de passe doit contenir au moins une lettre",
        "v.passwordNumber": "Le mot de passe doit contenir au moins un chiffre",
        "v.termsRequired": "Vous devez accepter la politique de confidentialité pour vous inscrire"
    },

    it: {
        "common.noValidFields": "Nessun campo valido da aggiornare",
        "errors.duplicate": "Il valore esiste già (deve essere unico)",
        "errors.invalidReference": "Riferimento non valido: una delle risorse collegate non esiste",
        "errors.internal": "Errore interno del server",
        "errors.routeNotFound": "Percorso non trovato: {method} {url}",
        "errors.invalidJson": "Il corpo della richiesta non è un JSON valido",
        "validation.failed": "Dati inseriti non validi",

        "auth.noToken": "Non è stato fornito alcun token di autenticazione",
        "auth.sessionExpired": "La sessione è scaduta. Accedi di nuovo.",
        "auth.invalidToken": "Token di autenticazione non valido",
        "auth.forbidden": "Non hai i permessi per eseguire questa azione",
        "auth.tooManyAttempts": "Troppi tentativi di accesso. Riprova tra qualche minuto.",
        "auth.invalidCredentials": "Email o password errati",
        "auth.loggedIn": "Accesso effettuato",

        "users.emailTaken": "L'email è già registrata",
        "users.notFound": "Utente non trovato",
        "users.profileUpdated": "Profilo aggiornato correttamente",
        "users.accountDeleted": "Account eliminato correttamente",
        "cv.noValidFields": "Nessun campo valido da salvare",
        "cv.notFound": "Non hai ancora creato il tuo CV",
        "cv.deleted": "CV eliminato correttamente",

        "applications.alreadyApplied": "Ti sei già candidato a questa offerta",
        "applications.notFound": "Candidatura non trovata",
        "applications.statusUpdated": "Stato aggiornato. Il candidato lo vedrà nelle sue candidature.",
        "applications.seenMarked": "Aggiornamenti segnati come visti",
        "applications.managedByCompany": "Lo stato di una candidatura a un'offerta è gestito dall'azienda. Puoi ritirare la candidatura se non ti interessa più.",
        "applications.updated": "Candidatura aggiornata correttamente",
        "applications.consentMissing": "Invia consent_contact e/o consent_cv",
        "applications.deleted": "Candidatura eliminata correttamente",

        "calendar.invalidRelated": "La candidatura indicata (related_application) non esiste o non è tua",
        "calendar.notFound": "Evento non trovato",
        "calendar.updated": "Evento aggiornato correttamente",
        "calendar.deleted": "Evento eliminato correttamente",

        "companies.emailTaken": "L'email dell'azienda è già registrata",
        "companies.notFound": "Azienda non trovata",
        "companies.updated": "Azienda aggiornata correttamente",
        "companies.hasOffers": "L'azienda ha offerte pubblicate. Eliminale prima di eliminare l'azienda.",
        "companies.deleted": "Azienda eliminata correttamente",

        "interviews.invalidType": "Il tipo di colloquio indicato (interview_type_id) non esiste",
        "interviews.notFound": "Colloquio non trovato",
        "interviews.updated": "Colloquio aggiornato correttamente",
        "interviews.deleted": "Colloquio eliminato correttamente",

        "jobs.invalidCompany": "L'azienda indicata (company_id) non esiste o non è tua",
        "jobs.notFound": "Offerta non trovata",
        "jobs.notFoundOrCompany": "Offerta non trovata, oppure l'azienda indicata non è tua",
        "jobs.updated": "Offerta aggiornata correttamente",
        "jobs.deleted": "Offerta eliminata correttamente",

        "ai.skillsMissing": "Invia skills nel corpo della richiesta o salvale prima nel tuo CV",

        "v.required": "{field}: questo campo è obbligatorio",
        "v.notEmpty": "{field}: non può essere vuoto",
        "v.invalid": "{field}: il valore non è valido",
        "v.int": "{field}: deve essere un numero intero valido",
        "v.intRange": "{field}: deve essere un numero intero tra {min} e {max}",
        "v.string": "{field}: deve essere un testo",
        "v.boolean": "{field}: deve essere true o false",
        "v.maxLength": "{field}: non può superare {max} caratteri",
        "v.oneOf": "{field}: deve essere uno di questi valori: {values}",
        "v.email": "{field}: non è un'email valida",
        "v.url": "{field}: non è un URL valido",
        "v.httpUrl": "{field}: deve essere un URL valido che inizi con http:// o https://",
        "v.datetime": "{field}: deve avere il formato AAAA-MM-GG HH:mm:ss",
        "v.arrayMin": "{field}: deve essere una lista con almeno {min} elemento",
        "v.arrayItemText": "{field}: ogni elemento deve essere un testo non vuoto",

        "v.consentRequired": "Devi accettare di condividere i tuoi dati di contatto con l'azienda per candidarti",
        "v.signatureRequired": "Devi scrivere il tuo nome per firmare la candidatura",
        "v.passwordLength": "La password deve contenere tra 8 e 72 caratteri",
        "v.passwordLetter": "La password deve contenere almeno una lettera",
        "v.passwordNumber": "La password deve contenere almeno un numero",
        "v.termsRequired": "Devi accettare l'informativa sulla privacy per registrarti"
    }
};

// Nombre visible de cada campo del body en los mensajes de validación. Si un
// campo no está aquí, se muestra su nombre técnico tal cual.
export const FIELD_LABELS = {
    es: {
        name: "Nombre", email: "Email", password: "Contraseña", role: "Rol", termsAccepted: "Política de privacidad",
        sector: "Sector", phone: "Teléfono", location: "Ubicación", profile_visible: "Perfil visible",
        education: "Formación", work_experience: "Experiencia laboral", skills: "Habilidades", about: "Sobre mí", resume_url: "Enlace al CV",
        job_offer_id: "Oferta", notes: "Notas", consent: "Consentimiento", consent_cv: "Compartir CV", consent_contact: "Compartir contacto",
        signature: "Firma", status: "Estado", title: "Título", description: "Descripción", event_type: "Tipo de evento",
        related_application: "Postulación relacionada", industry: "Sector", company_type: "Tipo de empresa", category: "Categoría",
        difficulty: "Dificultad", limit: "Límite", message: "Mensaje", lang: "Idioma", application_id: "Postulación",
        interview_type_id: "Tipo de entrevista", scheduled_date: "Fecha", company_id: "Empresa", salary: "Salario",
        employment_type: "Tipo de contrato", skills_required: "Habilidades requeridas", source: "Origen", external_url: "Enlace externo"
    },
    en: {
        name: "Name", email: "Email", password: "Password", role: "Role", termsAccepted: "Privacy policy",
        sector: "Industry", phone: "Phone", location: "Location", profile_visible: "Visible profile",
        education: "Education", work_experience: "Work experience", skills: "Skills", about: "About me", resume_url: "CV link",
        job_offer_id: "Job offer", notes: "Notes", consent: "Consent", consent_cv: "Share CV", consent_contact: "Share contact details",
        signature: "Signature", status: "Status", title: "Title", description: "Description", event_type: "Event type",
        related_application: "Related application", industry: "Industry", company_type: "Company type", category: "Category",
        difficulty: "Difficulty", limit: "Limit", message: "Message", lang: "Language", application_id: "Application",
        interview_type_id: "Interview type", scheduled_date: "Date", company_id: "Company", salary: "Salary",
        employment_type: "Contract type", skills_required: "Required skills", source: "Source", external_url: "External link"
    },
    fr: {
        name: "Nom", email: "Email", password: "Mot de passe", role: "Rôle", termsAccepted: "Politique de confidentialité",
        sector: "Secteur", phone: "Téléphone", location: "Lieu", profile_visible: "Profil visible",
        education: "Formation", work_experience: "Expérience professionnelle", skills: "Compétences", about: "À propos de moi", resume_url: "Lien vers le CV",
        job_offer_id: "Offre", notes: "Notes", consent: "Consentement", consent_cv: "Partager le CV", consent_contact: "Partager les coordonnées",
        signature: "Signature", status: "Statut", title: "Titre", description: "Description", event_type: "Type d'événement",
        related_application: "Candidature liée", industry: "Secteur", company_type: "Type d'entreprise", category: "Catégorie",
        difficulty: "Difficulté", limit: "Limite", message: "Message", lang: "Langue", application_id: "Candidature",
        interview_type_id: "Type d'entretien", scheduled_date: "Date", company_id: "Entreprise", salary: "Salaire",
        employment_type: "Type de contrat", skills_required: "Compétences requises", source: "Source", external_url: "Lien externe"
    },
    it: {
        name: "Nome", email: "Email", password: "Password", role: "Ruolo", termsAccepted: "Informativa sulla privacy",
        sector: "Settore", phone: "Telefono", location: "Località", profile_visible: "Profilo visibile",
        education: "Formazione", work_experience: "Esperienza lavorativa", skills: "Competenze", about: "Su di me", resume_url: "Link al CV",
        job_offer_id: "Offerta", notes: "Note", consent: "Consenso", consent_cv: "Condividi CV", consent_contact: "Condividi contatti",
        signature: "Firma", status: "Stato", title: "Titolo", description: "Descrizione", event_type: "Tipo di evento",
        related_application: "Candidatura collegata", industry: "Settore", company_type: "Tipo di azienda", category: "Categoria",
        difficulty: "Difficoltà", limit: "Limite", message: "Messaggio", lang: "Lingua", application_id: "Candidatura",
        interview_type_id: "Tipo di colloquio", scheduled_date: "Data", company_id: "Azienda", salary: "Stipendio",
        employment_type: "Tipo di contratto", skills_required: "Competenze richieste", source: "Origine", external_url: "Link esterno"
    }
};
