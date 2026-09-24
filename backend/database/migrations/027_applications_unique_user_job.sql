-- 027 — Una sola postulación por candidato y oferta (ver docs/decisions.md,
-- entrada 027). Para bases creadas antes de este cambio; shema.sql ya la trae.
-- Antes de aplicarla, comprobar que no hay duplicados:
--   SELECT user_id, job_offer_id, COUNT(*) FROM applications
--   WHERE job_offer_id IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
-- job_offer_id NULL (seguimientos personales) no cuenta: en MySQL un índice
-- UNIQUE admite varias filas con NULL.

ALTER TABLE applications
    ADD CONSTRAINT uq_application_user_job UNIQUE (user_id, job_offer_id);
