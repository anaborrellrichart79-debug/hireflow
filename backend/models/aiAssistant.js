import { getAllJobOffers } from "./jobOffer.js";

// Clasificador de intención por palabras clave -- no es un LLM (ver
// docs/decisions.md, entradas 010 y 014: se descartó explícitamente añadir
// un LLM real por coste/complejidad). Es una aproximación deliberadamente
// simple: cuenta coincidencias de frases/palabras por intención y se queda
// con la de mayor puntuación. Entiende frases habituales en los 4 idiomas de
// la app (es, en, fr, it; ver entrada 028); no "entiende" de verdad texto
// libre inesperado -- limitación conocida y documentada.
// \p{M} (Unicode "Mark") captura los diacríticos combinantes que deja
// normalize("NFD") -- evita escribir el rango ̀-ͯ a mano, más
// propenso a errores de codificación al editar el archivo.
const normalize = (text) =>
    (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// La palabra clave tiene que EMPEZAR una palabra del texto (no hace falta que
// la termine, así valen raíces como "tecnic" o "avanzad"). Antes se buscaba
// en cualquier posición y "ong" coincidía dentro de "strong" o "long", o
// "agil" dentro de "fragil". Con "$" al final tiene que ser la palabra
// entera: "moda$" no debe coincidir con "modalidad", ni "ong$" con "ongoing".
const keywordRegexCache = new Map();
const containsKeyword = (normalizedText, keyword) => {
    let regex = keywordRegexCache.get(keyword);
    if (!regex) {
        const wholeWord = keyword.endsWith("$");
        const text = normalize(wholeWord ? keyword.slice(0, -1) : keyword).trim();
        regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(text)}${wholeWord ? "(?![a-z0-9])" : ""}`);
        keywordRegexCache.set(keyword, regex);
    }
    return regex.test(normalizedText);
};

const INTENT_KEYWORDS = {
    cv_review: [
        // es
        "cv", "curriculum", "revisar mi cv", "revision de cv", "mejorar mi cv", "revisame el cv",
        "consejos de cv", "como hago mi cv", "que tal esta mi cv", "consejos para el curriculum",
        // en
        "resume", "review my cv", "review my resume", "improve my cv", "improve my resume",
        // fr
        "revise mon cv", "revoir mon cv", "ameliorer mon cv",
        // it
        "rivedi il mio cv", "migliorare il mio cv"
    ],
    interview_questions: [
        // es. "preguntas" sola: "preguntas personales", "preguntas técnicas
        // avanzadas"... Plural a propósito: "tengo una pregunta sobre mi cv"
        // no debe contar (ver entrada 026). Igual con "questions" y "domande".
        "que me pueden preguntar", "que me preguntaran", "preguntas de entrevista",
        "prepararme para la entrevista", "como preparo la entrevista", "practicar entrevista",
        "prepara la entrevista", "simular entrevista", "que preguntas hacen",
        "preguntas para la entrevista", "que me van a preguntar", "preguntas",
        // en
        "what will they ask", "interview questions", "questions", "prepare for the interview",
        "prepare for an interview", "prepare for my interview", "mock interview", "practice interview",
        // fr
        "vont-ils me demander", "questions d'entretien", "preparer un entretien", "preparer l'entretien",
        "preparer mon entretien", "simuler un entretien",
        // it
        "mi chiederanno", "domande", "domande del colloquio", "prepararmi al colloquio",
        "prepararmi per il colloquio", "simulare un colloquio"
    ],
    interview_feedback: [
        // es
        "como mejorar", "consejos para mejorar", "mejorar mis habilidades", "mejorar skills",
        "feedback", "que tal me fue", "como lo hice", "quiero mejorar", "consejos de mejora",
        "como puedo mejorar", "que puedo mejorar", "necesito mejorar",
        // en
        "how to improve", "how can i improve", "improve my", "tips to improve", "get better at",
        // fr
        "comment ameliorer", "ameliorer ma", "ameliorer mes", "conseils pour ameliorer", "progresser en",
        // it
        "come migliorare", "come posso migliorare", "migliorare la mia", "migliorare le mie", "consigli per migliorare"
    ],
    job_match: [
        // es
        "encajo", "esta oferta", "compatibilidad", "match", "soy apto", "soy compatible",
        "que tal encajo", "encajaria", "sirvo para esta oferta", "es para mi esta oferta",
        // en
        "do i match", "good fit", "this job", "this offer", "am i suitable",
        // fr
        "je corresponds", "cette offre", "suis-je compatible", "compatible avec",
        // it
        "sono adatto", "sono adatta", "questa offerta", "sono compatibile", "compatibile con"
    ]
};

export const classifyIntent = (text) => {
    const normalized = normalize(text);
    const scores = {};

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        scores[intent] = keywords.reduce(
            (count, kw) => count + (containsKeyword(normalized, kw) ? 1 : 0),
            0
        );
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topIntent, topScore] = sorted[0];
    const secondScore = sorted[1][1];

    if (topScore === 0) {
        return { intent: "off_topic", scores };
    }

    if (topScore === secondScore) {
        return { intent: "ambiguous", scores };
    }

    return { intent: topIntent, scores };
};

// Coincide con los valores de industry realmente almacenados en
// ai_resume_guides tras la limpieza de typos (ver docs/decisions.md, entrada 014).
// Ojo con los falsos amigos: "recherche"/"ricerca" son también "búsqueda (de
// empleo)", así que no sirven para el sector académico; y "commerce" empieza
// igual que "commercial", así que no se usa suelto para atención al cliente.
const INDUSTRY_KEYWORDS = {
    corporate_companies: [
        "banca", "banco", "consultoria", "derecho", "abogacia", "seguros", "aseguradora", "gran industria", "corporativo",
        "banking", "bank", "consulting", "law firm", "legal", "insurance", "corporate",
        "banque", "cabinet de conseil", "droit", "juridique", "assurance",
        "consulenza", "studio legale", "assicura"
    ],
    startups: [
        "startup", "tecnologia", "programacion", "desarrollo de software", "fintech", "data science", "marketing digital", "software",
        "technology", "tech company", "programming", "developer",
        "programmation", "logiciel", "developpeur",
        "programmazione", "sviluppatore"
    ],
    creative_design: [
        "diseno", "publicidad", "arquitectura", "moda$", "creativ", "grafico", "marca$",
        "design", "advertising", "architecture", "fashion", "graphic",
        "publicite", "la mode", "graphisme",
        "pubblicita", "architettura", "grafica"
    ],
    customer_service: [
        "atencion al cliente", "hosteleria", "comercio", "recepcion", "retail",
        "customer service", "customer support", "hospitality", "reception",
        "service client", "hotellerie", "restauration", "accueil", "commerce de detail",
        "servizio clienti", "assistenza clienti", "ristorazione", "alberghier"
    ],
    public_academic: [
        "docencia", "investigacion", "administracion publica", "universidad", "academico", "funcionario", "oposicion",
        "teaching", "research", "public sector", "public administration", "university", "academic", "civil service",
        "enseignement", "chercheur", "recherche scientifique", "fonction publique", "universite",
        "insegnamento", "ricercatore", "ricerca scientifica", "pubblica amministrazione", "universita", "accademic", "concorso"
    ],
    healthcare: [
        "sanidad", "salud", "hospital", "clinic", "farmaceutic", "enfermeria", "medic",
        "healthcare", "health", "pharma", "nursing",
        "sante", "hopital", "pharmaceutique", "infirmi", "medecin",
        "sanita", "salute", "ospedale", "infermier"
    ],
    non_profit: [
        "ong$", "ongs$", "fundacion", "cooperacion", "tercer sector", "sin animo de lucro",
        "ngo", "non-profit", "nonprofit", "non profit", "charity", "foundation",
        "association", "fondation", "humanitaire",
        "onlus", "fondazione", "volontariato", "terzo settore"
    ],
    logistics: [
        "logisti", "transport", "almacen", "cadena de suministro", "supply chain",
        "warehouse", "entrepot", "chaine d'approvisionnement",
        "trasport", "magazzin", "catena di approvvigionamento"
    ],
    engineering: [
        "ingenieria", "construccion", "fabrica", "manufactura", "obra$",
        "engineering", "construction", "manufacturing", "factory",
        "ingenierie", "usine", "btp",
        "ingegneria", "costruzion", "edilizia", "fabbrica", "manifattur"
    ],
    sales: [
        "ventas", "comercial", "desarrollo de negocio", "business development",
        "sales", "vente", "commercial", "developpement commercial",
        "vendite", "vendita"
    ]
};

export const extractIndustry = (text) => {
    const normalized = normalize(text);
    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (keywords.some((kw) => containsKeyword(normalized, kw))) {
            return industry;
        }
    }
    return null;
};

// Raíces en vez de palabras completas ("tecnic", "avanzad"...) para que valgan
// masculino, femenino y plural (entrada 026), y en los 4 idiomas (entrada 028).
const CATEGORY_KEYWORDS = {
    personal: ["personal", "sobre mi", "hablame de ti", "about me", "about myself", "personnel", "sur moi", "su di me"],
    technical: ["tecnic", "technic", "programacion", "programming", "programmation", "programmazione", "herramientas", "tools", "outils", "strumenti"],
    behavioral: ["comportament", "comportement", "behavio", "situacional", "situation", "situazional", "situacion pasada", "experiencia pasada"],
    stress: ["estres", "stress", "presion", "pression", "pressure", "dificiles"],
    culture_fit: ["cultura", "culture", "encaje cultural", "valores", "values", "valeurs", "valori"]
};

const DIFFICULTY_KEYWORDS = {
    basic: ["basic", "facil", "sencill", "easy", "simple", "basique", "semplic", "di base"],
    intermediate: ["intermedi", "nivel medio", "medium", "moyen", "livello medio"],
    advanced: ["avanzad", "avanzat", "advanced", "avance", "dificil", "difficil", "difficult", "hard questions", "tough", "complej", "complex", "compless"]
};

const matchFirst = (text, map) => {
    const normalized = normalize(text);
    for (const [value, keywords] of Object.entries(map)) {
        if (keywords.some((kw) => containsKeyword(normalized, kw))) {
            return value;
        }
    }
    return null;
};

export const extractCategory = (text) => matchFirst(text, CATEGORY_KEYWORDS);
export const extractDifficulty = (text) => matchFirst(text, DIFFICULTY_KEYWORDS);

// Palabras gatillo de cada skill del catálogo, en los 4 idiomas. Cada entrada
// devuelve `search`: un trozo del skill_name en español (tal como está en
// ai_skill_improvement) que findSkillImprovementBySkillNames busca con
// LIKE '%...%' -- p. ej. "leadership" devuelve "liderazgo", que encuentra
// "Liderazgo e Influencia". El contenido se traduce después (entrada 028).
const SKILL_TRIGGERS = [
    { search: "comunicacion", words: ["comunicacion", "communication", "comunicazione", "asertiv", "assertiv"] },
    { search: "pensamiento critico", words: ["pensamiento critico", "resolucion de problemas", "critical thinking", "problem solving", "problem-solving", "pensee critique", "resolution de problemes", "pensiero critico", "risoluzione dei problemi"] },
    { search: "adaptabilidad", words: ["adaptabilidad", "flexibilidad", "adaptability", "flexibility", "adaptabilite", "flexibilite", "adattabilita", "flessibilita"] },
    { search: "datos", words: ["datos", "data literacy", "data analysis", "analyse de donnees", "donnees", "analisi dei dati", "dati$"] },
    { search: "gestion del tiempo", words: ["gestion del tiempo", "productividad", "time management", "productivity", "gestion du temps", "productivite", "gestione del tempo", "produttivita"] },
    { search: "liderazgo", words: ["liderazgo", "leadership", "leader"] },
    { search: "ia generativa", words: ["ia generativa", "prompt engineering", "generative ai", "ia generative", "intelligenza artificiale generativa", "prompt"] },
    { search: "inteligencia emocional", words: ["inteligencia emocional", "emotional intelligence", "intelligence emotionnelle", "intelligenza emotiva"] },
    { search: "agil", words: ["agil", "agile", "scrum"] },
    { search: "sistemico", words: ["sistemico", "systems thinking", "pensee systemique", "pensiero sistemico"] },
    { search: "marca personal", words: ["marca personal", "networking", "personal branding", "personal brand", "marque personnelle"] },
    { search: "financiera", words: ["financiera", "business acumen", "financial literacy", "culture financiere", "alfabetizzazione finanziaria"] },
    { search: "negociacion", words: ["negociacion", "negotiat", "negociation", "negoziazione", "trattativ"] },
    { search: "oratoria", words: ["oratoria", "hablar en publico", "public speaking", "prise de parole", "parler en public", "parlare in pubblico"] },
    { search: "trabajo en equipo", words: ["trabajo en equipo", "teamwork", "team work", "travail d'equipe", "travail en equipe", "lavoro di squadra", "lavoro in team"] },
    { search: "gestion de proyectos", words: ["gestion de proyectos", "project management", "gestion de projet", "gestione dei progetti", "gestione progetti"] },
    { search: "atencion al detalle", words: ["atencion al detalle", "attention to detail", "souci du detail", "attenzione ai dettagli"] },
    { search: "resiliencia", words: ["resiliencia", "estres", "resilience", "stress", "resilienza"] },
    { search: "pensamiento creativo", words: ["pensamiento creativo", "creatividad", "creativity", "creative thinking", "creativite", "pensee creative", "creativita", "pensiero creativo"] },
    { search: "ventas", words: ["ventas", "persuasion", "sales", "selling", "vente", "persuasione", "vendita"] }
];

export const extractSkillKeywords = (text) => {
    const normalized = normalize(text);
    return SKILL_TRIGGERS
        .filter(({ words }) => words.some((word) => containsKeyword(normalized, word)))
        .map(({ search }) => search);
};

// Match de ofertas por título: compara las palabras "significativas" (>3
// letras) del título de cada oferta contra el mensaje del usuario. Si varias
// ofertas coinciden pero una lo hace con más palabras que las demás (título
// más específico, p. ej. "Desarrollador Backend Senior" frente a
// "Desarrollador Backend" cuando el usuario escribe el título completo), se
// devuelve solo esa -- evita pedir que desambigüe en un caso que para un
// humano es obvio. Solo se piden varias candidatas cuando hay empate real.
export const extractJobMatches = async (text) => {
    const normalized = normalize(text);
    const jobs = await getAllJobOffers();

    const candidates = jobs
        .map((job) => {
            const titleWords = normalize(job.title)
                .split(/[^a-z0-9]+/)
                .filter((word) => word.length > 3);
            const matches = titleWords.length > 0 && titleWords.every((word) => normalized.includes(word));
            return matches ? { job, wordCount: titleWords.length } : null;
        })
        .filter(Boolean);

    if (candidates.length === 0) {
        return [];
    }

    const maxWordCount = Math.max(...candidates.map((c) => c.wordCount));
    return candidates.filter((c) => c.wordCount === maxWordCount).map((c) => c.job);
};
