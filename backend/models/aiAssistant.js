import { getAllJobOffers } from "./jobOffer.js";

// Clasificador de intención por palabras clave -- no es un LLM (ver
// docs/decisions.md, entradas 010 y 014: se descartó explícitamente añadir
// un LLM real por coste/complejidad). Es una aproximación deliberadamente
// simple: cuenta coincidencias de frases/palabras por intención y se queda
// con la de mayor puntuación. Funciona razonablemente con frases esperadas
// en español; no "entiende" de verdad texto libre inesperado ni otros
// idiomas -- limitación conocida y documentada.
// \p{M} (Unicode "Mark") captura los diacríticos combinantes que deja
// normalize("NFD") -- evita escribir el rango ̀-ͯ a mano, más
// propenso a errores de codificación al editar el archivo.
const normalize = (text) =>
    (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

const INTENT_KEYWORDS = {
    cv_review: [
        "cv", "curriculum", "resume", "revisar mi cv", "revision de cv",
        "mejorar mi cv", "revisame el cv", "consejos de cv", "como hago mi cv",
        "que tal esta mi cv", "consejos para el curriculum"
    ],
    interview_questions: [
        "que me pueden preguntar", "que me preguntaran", "preguntas de entrevista",
        "prepararme para la entrevista", "como preparo la entrevista", "practicar entrevista",
        "prepara la entrevista", "simular entrevista", "que preguntas hacen",
        "preguntas para la entrevista", "que me van a preguntar"
    ],
    interview_feedback: [
        "como mejorar", "consejos para mejorar", "mejorar mis habilidades", "mejorar skills",
        "feedback", "que tal me fue", "como lo hice", "quiero mejorar", "consejos de mejora",
        "como puedo mejorar", "que puedo mejorar", "necesito mejorar"
    ],
    job_match: [
        "encajo", "esta oferta", "compatibilidad", " match", "soy apto", "soy compatible",
        "que tal encajo", "encajaria", "sirvo para esta oferta", "es para mi esta oferta"
    ]
};

export const classifyIntent = (text) => {
    const normalized = normalize(text);
    const scores = {};

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        scores[intent] = keywords.reduce(
            (count, kw) => count + (normalized.includes(normalize(kw)) ? 1 : 0),
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
const INDUSTRY_KEYWORDS = {
    corporate_companies: ["banca", "banco", "consultoria", "derecho", "abogacia", "seguros", "aseguradora", "gran industria", "corporativo"],
    startups: ["startup", "tecnologia", "programacion", "desarrollo de software", "fintech", "data science", "marketing digital", "software"],
    creative_design: ["diseno", "publicidad", "arquitectura", "moda", "creativo", "grafico", "marca"],
    customer_service: ["atencion al cliente", "hosteleria", "comercio", "recepcion", "retail"],
    public_academic: ["docencia", "investigacion", "administracion publica", "universidad", "academico", "funcionario", "oposicion"],
    healthcare: ["sanidad", "salud", "hospital", "clinica", "farmaceutica", "enfermeria", "medicina"],
    non_profit: ["ong", "fundacion", "cooperacion", "tercer sector", "sin animo de lucro"],
    logistics: ["logistica", "transporte", "almacen", "cadena de suministro", "supply chain"],
    engineering: ["ingenieria", "construccion", "fabrica", "manufactura", "obra"],
    sales: ["ventas", "comercial", "desarrollo de negocio", "business development"]
};

export const extractIndustry = (text) => {
    const normalized = normalize(text);
    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (keywords.some((kw) => normalized.includes(normalize(kw)))) {
            return industry;
        }
    }
    return null;
};

const CATEGORY_KEYWORDS = {
    personal: ["personal", "sobre mi", "hablame de ti"],
    technical: ["tecnica", "tecnico", "programacion", "herramientas"],
    behavioral: ["comportamental", "situacion pasada", "experiencia pasada"],
    stress: ["estres", "presion", "dificiles"],
    culture_fit: ["cultura", "encaje cultural", "valores"]
};

const DIFFICULTY_KEYWORDS = {
    basic: ["basico", "facil", "sencillo"],
    intermediate: ["intermedio", "medio"],
    advanced: ["avanzado", "dificil", "complejo"]
};

const matchFirst = (text, map) => {
    const normalized = normalize(text);
    for (const [value, keywords] of Object.entries(map)) {
        if (keywords.some((kw) => normalized.includes(normalize(kw)))) {
            return value;
        }
    }
    return null;
};

export const extractCategory = (text) => matchFirst(text, CATEGORY_KEYWORDS);
export const extractDifficulty = (text) => matchFirst(text, DIFFICULTY_KEYWORDS);

// Palabras/frases gatillo para cada skill del catálogo. No hace falta que
// coincidan exactamente con skill_name: findSkillImprovementBySkillNames ya
// busca por LIKE '%...%', así que basta con detectar la palabra clave y
// dejar que esa búsqueda encuentre la fila real (p. ej. "liderazgo" encuentra
// "Liderazgo e Influencia").
const SKILL_TRIGGER_WORDS = [
    "comunicacion", "pensamiento critico", "resolucion de problemas", "adaptabilidad",
    "flexibilidad", "datos", "gestion del tiempo", "productividad", "liderazgo",
    "ia generativa", "prompt engineering", "inteligencia emocional", "agile", "agil",
    "sistemico", "marca personal", "networking", "financiera", "negociacion",
    "oratoria", "hablar en publico", "trabajo en equipo", "gestion de proyectos",
    "atencion al detalle", "resiliencia", "estres", "pensamiento creativo", "creatividad",
    "ventas", "persuasion"
];

export const extractSkillKeywords = (text) => {
    const normalized = normalize(text);
    return SKILL_TRIGGER_WORDS.filter((kw) => normalized.includes(normalize(kw)));
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
