-- 034 — Retirar o volver a dar el consentimiento de una postulación
-- (ver docs/decisions.md, entrada 034). Para bases creadas antes de este
-- cambio; schema.sql ya incluye la columna.

ALTER TABLE applications
    ADD COLUMN consent_updated_at timestamp NULL AFTER consent_at;
