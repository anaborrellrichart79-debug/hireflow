import { t } from "./i18n.js";

// job_offers.employment_type y .salary son varchar libres en la BD (sin
// ENUM), pero las pills del formulario ofrecen un conjunto cerrado de
// opciones. Si se guardara directamente la etiqueta visible ("Indefinido",
// "Permanent", "CDI"...) cada idioma guardaría un valor distinto para el
// mismo concepto, y las cards de otras pantallas no sabrían traducirlo de
// vuelta. Por eso se guarda siempre un código estable en inglés (coincide
// con el criterio ya usado en los datos de ejemplo del proyecto, p. ej.
// "full_time"), y la etiqueta se traduce solo para mostrarla.
export const EMPLOYMENT_TYPE_CODES = [
    "permanent", "short_term", "hourly", "full_time", "part_time", "negotiable"
];

export const SALARY_CODES = ["min_wage", "1600", "1900", "2200", "experience"];

const LABEL_KEYS = {
    permanent: "jobForm.contractIndefinido",
    short_term: "jobForm.contractCortaDuracion",
    hourly: "jobForm.contractPorHoras",
    full_time: "jobForm.scheduleCompleta",
    part_time: "jobForm.scheduleMediaJornada",
    negotiable: "jobForm.scheduleAConvenir",
    min_wage: "jobForm.salaryMinimo",
    1600: "jobForm.salary1600",
    1900: "jobForm.salary1900",
    2200: "jobForm.salary2200",
    experience: "jobForm.salaryExperiencia"
};

// Si el valor no es uno de los códigos conocidos (p. ej. viene de una
// oferta creada antes de introducir este mapeo, o de datos de prueba en
// texto libre), se muestra tal cual en vez de romper.
export const jobOptionLabel = (code) => {
    if (!code) return code;
    const key = LABEL_KEYS[code];
    return key ? t(key) : code;
};
