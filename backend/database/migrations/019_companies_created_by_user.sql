-- 019 — Dueño de cada empresa (ver docs/decisions.md, entrada 019).
-- Para bases creadas antes de este cambio; schema.sql ya incluye la columna.

ALTER TABLE companies
    ADD COLUMN created_by_user int NULL AFTER phone,
    ADD CONSTRAINT fk_company_creator
        FOREIGN KEY (created_by_user) REFERENCES users(id) ON DELETE SET NULL;

-- Las empresas existentes pasan a ser del recruiter que publicó sus ofertas,
-- solo cuando todas sus ofertas son de un mismo recruiter. Las demás quedan
-- sin dueño: nadie puede editarlas ni borrarlas desde la API.
UPDATE companies c
JOIN (
    SELECT company_id, MIN(created_by_user) AS owner
    FROM job_offers
    WHERE created_by_user IS NOT NULL
    GROUP BY company_id
    HAVING COUNT(DISTINCT created_by_user) = 1
) j ON j.company_id = c.id
SET c.created_by_user = j.owner;
