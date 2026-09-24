-- 028 — Asistente IA en 4 idiomas (ver docs/decisions.md, entrada 028).
-- Para bases creadas antes de este cambio. Después de este archivo, ejecutar
-- seed_ai_translations.sql (en la carpeta database/), que rellena la tabla.
-- Ejecutar con --default-character-set=utf8mb4.

CREATE TABLE IF NOT EXISTS ai_content_translations (
    source_table enum('ai_interview_questions','ai_resume_guides','ai_skill_improvement') NOT NULL,
    source_id int NOT NULL,
    field varchar(40) NOT NULL,
    lang char(2) NOT NULL,
    content text NOT NULL,
    PRIMARY KEY (source_table, source_id, field, lang)
);

-- Erratas del texto original en español. REPLACE distingue tildes y
-- mayúsculas, así que reejecutarlo no cambia nada.
UPDATE ai_resume_guides SET recomendations = REPLACE(recomendations, '¿Díme en qué sector profesional te mueves tú para poder darte consejos más específicos?', 'Dime en qué sector profesional te mueves para poder darte consejos más específicos.') WHERE id = 2;
UPDATE ai_resume_guides SET recomendations = REPLACE(recomendations, 'Valoran la agilidad, la autoaprendizaje', 'Valoran la agilidad, el autoaprendizaje') WHERE id = 4;
UPDATE ai_skill_improvement SET description = REPLACE(description, 'expresar ideas,sentimientos', 'expresar ideas, sentimientos') WHERE id = 1;
UPDATE ai_skill_improvement SET description = REPLACE(description, 'al mismno tiempo', 'al mismo tiempo') WHERE id = 1;
