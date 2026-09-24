-- 026 — Preguntas de entrevista sin plantillas sin rellenar ni erratas
-- (ver docs/decisions.md, entrada 026). Para bases creadas antes de este
-- cambio; seed.sql ya trae los textos nuevos.
-- Cada UPDATE va por id y además exige un trozo del texto antiguo, para no
-- tocar nada si la fila ya se cambió o no es la esperada.
-- Ejecutar con --default-character-set=utf8mb4.

UPDATE ai_interview_questions SET question = 'Háblame de ti'
WHERE id = 1 AND BINARY question = BINARY 'Háblame de tí';  -- BINARY: la collation ignora tildes (tí = ti)

UPDATE ai_interview_questions SET question = '¿Cómo te definirías en tres palabras?'
WHERE id = 2 AND BINARY question LIKE BINARY '%definirias%';

UPDATE ai_interview_questions SET question = '¿Podrías explicarme, como si yo no fuera del sector, una herramienta o concepto clave de tu día a día y para qué sirve?'
WHERE id = 4 AND question LIKE '%[X concepto base]%';

UPDATE ai_interview_questions SET question = 'Elige dos herramientas o tecnologías parecidas que hayas usado. ¿En qué se diferencian y cuándo usarías cada una?'
WHERE id = 7 AND question LIKE '%[Opci%A]%';

UPDATE ai_interview_questions SET question = 'Algo que funcionaba ayer ha dejado de funcionar hoy y nadie sabe por qué. ¿Cuál es el primer paso que das para diagnosticarlo?'
WHERE id = 8 AND question LIKE '%[error/fallo%';

UPDATE ai_interview_questions SET question = '¿Cómo decides qué herramienta o tecnología usar al empezar un proyecto nuevo? Ponme un ejemplo real.'
WHERE id = 10 AND question LIKE '%herramienta X en lugar de la Y%';

UPDATE ai_interview_questions SET question = 'En esta pizarra, dibuja el esquema de un proyecto en el que hayas trabajado y explícame cómo se conectan sus partes.'
WHERE id = 11 AND question LIKE '%[tarea espec%';

UPDATE ai_interview_questions SET question = 'Si tuvieras que diseñar desde cero el sistema o proceso con el que trabajabas en tu último puesto, ¿qué harías distinto y por qué?'
WHERE id = 12 AND question LIKE '%[X concepto]%';

UPDATE ai_interview_questions SET question = '¿Cómo crees que la inteligencia artificial afectará a los procesos actuales de nuestro sector?'
WHERE id = 14 AND question LIKE '%[nueva tecnolog%';

UPDATE ai_interview_questions SET question = 'Yo defiendo una solución y tú propones otra distinta. Convénceme de por qué tu enfoque es mejor en términos de escalabilidad y costes.'
WHERE id = 15 AND question LIKE '%es[A]%';

UPDATE ai_interview_questions SET question = 'Sinceramente, veo que te falta experiencia para este puesto. ¿Por qué crees que no perderemos el tiempo contigo?'
WHERE id = 28 AND question LIKE '%contigo?"';

UPDATE ai_interview_questions SET question = '(El reclutador te corta a mitad de frase) Eso que dices no tiene sentido, ve al grano. ¿Qué hiciste exactamente?'
WHERE id = 32 AND question LIKE 'El reclutador te corta a mitad de frase):%';

UPDATE ai_interview_questions SET question = 'Piensa en uno de los valores de esta empresa. ¿Puedes darme un ejemplo de tu vida personal o profesional en el que lo hayas aplicado sin que nadie te lo pidiera?'
WHERE id = 48 AND question LIKE 'Nuestros valores son X e Y%';
