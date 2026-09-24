# Google Play — Data Safety (borrador de respuestas)

Este documento **no es una pantalla de la app**. La sección "Data Safety" ("Seguridad de los datos") es un cuestionario que el **desarrollador** (Ana, como publisher) rellena una sola vez en Google Play Console al dar de alta o actualizar la ficha de la app — los usuarios finales nunca lo ven ni lo rellenan, solo ven el resumen resultante en la ficha de la Play Store. Este documento recoge, a partir de lo que HireFlow realmente hace hoy, las respuestas que tocaría marcar en ese formulario cuando llegue el momento de publicar la app.

> Aviso: es un borrador de apoyo, no garantiza el cumplimiento de las políticas de Google Play (que cambian con el tiempo). Antes de enviarlo, revisar el formulario real en Play Console, que puede pedir más detalle o haber cambiado de estructura.

## 1. ¿Recopila o comparte la app alguno de los siguientes tipos de datos?

| Categoría | ¿Se recopila? | ¿Se comparte con terceros? | Detalle |
|---|---|---|---|
| Nombre | Sí | Sí, condicionalmente | Se comparte con la empresa a la que el candidato se postula, solo si dio su consentimiento expreso en esa postulación (ver `docs/decisions.md`, entrada 017). No se comparte con nadie más. |
| Dirección de email | Sí | Sí, condicionalmente | Igual que el nombre: solo con la empresa, solo con consentimiento explícito por postulación. También se usa internamente para el login. |
| Número de teléfono | Sí (opcional, campo de perfil) | Sí, condicionalmente | Igual que el nombre/email. Es un campo opcional del perfil del candidato. |
| Otra información (sector, ubicación) | Sí (opcional, campos de perfil) | No | Solo visible para la empresa a la que se postula, junto con el resto de datos de contacto, con el mismo consentimiento. |
| Contraseña / credenciales | Sí | No | Se almacena solo el hash (bcrypt), nunca en texto plano. No se comparte ni se expone en ninguna respuesta de la API. |
| Datos financieros / de pago | **No se recopilan** | No aplica | HireFlow nunca pide datos bancarios, número de tarjeta ni similares — es un compromiso explícito de producto, comunicado a los usuarios en el modal de consentimiento al postularse y en la Política de Privacidad. |
| Datos de salud, ideología, u otras categorías especiales (RGPD art. 9) | **No se recopilan** | No aplica | La app no tiene ningún campo para este tipo de datos. |
| Ubicación precisa (GPS) | No | No aplica | El campo "ubicación" del perfil es texto libre (ciudad/zona), no geolocalización del dispositivo. |
| Identificadores de dispositivo / publicidad | No | No aplica | La app no integra SDKs de publicidad ni analítica de terceros. |

## 2. ¿Se cifran los datos en tránsito?

Sí, obligatorio en producción (HTTPS). El desarrollo local usa HTTP sin TLS por simplicidad — antes de publicar, la API debe servirse exclusivamente sobre HTTPS.

## 3. ¿Pueden los usuarios solicitar la eliminación de sus datos?

Sí. Cualquier usuario puede eliminar su cuenta desde la pantalla de perfil (`DELETE /users/me`), lo que borra en cascada (claves foráneas `ON DELETE CASCADE`) sus postulaciones, notas y entrevistas asociadas.

## 4. ¿Se compromete la app a seguir las Familias de Google Play (Families Policy)?

No aplica: HireFlow no está dirigida a menores de 16 años (ver Política de Privacidad, sección 10) y no debe listarse en la categoría de apps para familias/niños.

## 5. Contexto para justificar las respuestas anteriores

- **Por qué se comparten datos con "terceros" en el sentido de Google Play**: a ojos de Google, cada empresa/reclutador que usa HireFlow para publicar ofertas es un "tercero" respecto al candidato que se postula, aunque ambos sean usuarios de la misma app. De ahí que nombre/email/teléfono se marquen como "compartidos", condicionados siempre al consentimiento explícito capturado en `applications.consent_share_contact` (ver `backend/models/application.js`).
- **Por qué el resto de datos (sector, ubicación) no se marca como "compartido" de forma independiente**: solo se exponen junto con el resto del perfil de contacto a la empresa correspondiente, bajo el mismo consentimiento — no se venden ni se ceden por separado a nadie más.
- **Base para "eliminación de datos bajo petición"**: `DELETE /users/me` (`backend/controllers/userControllers.js`) + `ON DELETE CASCADE` en las tablas relacionadas (`schema.sql`).

## 6. Enlace a la Política de Privacidad

Google Play exige un enlace público a la política de privacidad completa. Mientras la app esté en desarrollo, el contenido vive en `frontend/js/privacyPolicyContent.js` y se muestra dentro de la propia app (modal en el registro). **Antes de publicar en Play Store, esa política debe alojarse también en una URL pública** (por ejemplo, una página estática fuera del flujo de login) para poder pegarla en el campo correspondiente de Play Console — hoy no existe esa URL pública, es un pendiente.
