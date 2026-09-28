-- 033 — CV del candidato (ver docs/decisions.md, entrada 033).
-- Para bases creadas antes de este cambio; schema.sql ya incluye ambos cambios.

-- 1:1 real entre users y user_profiles: permite el upsert atómico de
-- PUT /users/me/cv. Antes, comprobar que no hay duplicados (debe devolver 0 filas):
--   SELECT user_id, COUNT(*) FROM user_profiles GROUP BY user_id HAVING COUNT(*) > 1;
ALTER TABLE user_profiles
    ADD CONSTRAINT uq_user_profile_user UNIQUE (user_id);

-- Consentimiento aparte y opcional para que la empresa vea el CV
ALTER TABLE applications
    ADD COLUMN consent_share_cv tinyint(1) NOT NULL DEFAULT 0 AFTER consent_share_contact;
