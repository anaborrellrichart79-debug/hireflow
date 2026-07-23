USE hireflow;


INSERT INTO interview_types (name, description) VALUES
('Estructurada','El reclutador sigue un guion preestablecido con preguntas concretas e iguales para todos los candidatos, lo que permite una evaluación objetiva.'),
('No estructurada','Es una conversación flexible y abierta. Permite al aspirante expresarse libremente, facilitando la naturalidad, aunque es menos objetiva.'),
('Semiestructurada','Una mezcla de las dos anteriores. Hay una guía inicial, pero el entrevistador tiene libertad para profundizar en respuestas interesantes.'),
('competencias','Busca ejemplos específicos de cómo has demostrado habilidades (liderazgo, trabajo en equipo, resolución de problemas) en situaciones pasadas.'),
('conductual','Se centra en tus comportamientos pasados para predecir tu comportamiento futuro en el puesto, pidiendo ejemplos concretos de tu experiencia.'),
('tensión',' Poco común. Se utiliza para observar cómo gestionas situaciones de presión, tensión o conflicto'),
('caso','Se presenta un problema o situación hipotética de la empresa para evaluar tu capacidad analítica y resolución de problemas.'),
('Técnica','Profundiza en los conocimientos técnicos, habilidades específicas y herramientas necesarias para el puesto.'),
('Telefónica','Suele ser el primer filtro para validar datos básicos del currículum, explican Job Teaser.'),
('Online','Muy común en procesos remotos o internacionales, permitiendo el contacto visual sin desplazamiento.'),
('Presencial','El formato clásico cara a cara entre un reclutador y el candidato.'),
('Panel','Te entrevistan varias personas de la empresa a la vez, lo que permite evaluar el puesto desde diferentes perspectivas'),
('Seguimiento','Se realiza después de una primera entrevista para aclarar dudas o profundizar en ciertos aspectos.'),
('Dinámica de grupo','Varios candidatos son entrevistados a la vez para evaluar su interacción, liderazgo y capacidad de trabajo en equipo.');


INSERT INTO ai_interview_questions (question, category, difficulty) VALUES
('Háblame de tí','personal','basic'),
('¿Cómo te definirias en tres palabras?','personal','intermediate'),
('¿Qué conoces de nuestra empresa?','personal','advanced'),
('¿Podrías explicarme qué es [X concepto base] y para qué sirve?','technical','basic'),
('¿Qué software o herramientas has utilizado en tu anterior puesto y qué nivel de dominio tienes?','technical','basic'),
('¿Has trabajado con metodologías Agile, Scrum o algún flujo de trabajo específico?','technical','basic'),
('¿Cuál es la diferencia principal entre [Opción A] y [Opción B]?','technical','basic'),
('Si te encuentras con [error/fallo típico], ¿cuál es el primer paso que das para diagnosticarlo?','technical','intermediate'),
('¿Cómo mejorarías un proceso que actualmente tarda demasiado tiempo o consume muchos recursos?','technical','intermediate'),
('¿Por qué elegirías la herramienta X en lugar de la Y para un proyecto de estas características?','technical','intermediate'),
('En esta pizarra, dibuja el esquema o explica los pasos para realizar [tarea específica]','technical','intermediate'),
('¿Cómo diseñarías [X concepto]?','technical','advanced'),
('Cuéntame el problema técnico más complejo que hayas resuelto. ¿Qué salió mal y cómo evitaste que volviera a ocurrir?','technical','advanced'),
('¿Cómo crees que la llegada de [nueva tecnología/IA] afectará a los procesos actuales de nuestro sector?','technical','advanced'),
('Yo sostengo que la mejor solución es[A], pero tú propones [B]. Convénceme de por qué tu enfoque es mejor en términos de escalabilidad y costes','technical','advanced'),
('¿Puedes darme un ejemplo de una ocasión en la que tuviste que esforzarte extra para cumplir con una fecha de entrega?','behavioral','basic'),
('Cuéntame de alguna vez en la que tuviste que seguir una norma o procedimiento con el que no estabas de acuerdo. ¿Cómo lo gestionaste?','behavioral','basic'),
('¿Cómo describirías tu relación con tu último equipo de trabajo? Dame un ejemplo de cómo ayudaste a un compañero.','behavioral','basic'),
('Describe cómo planificas un día típico de trabajo cuando tienes varias tareas pendientes.','behavioral','basic'),
('Háblame de un error que cometiste en el trabajo. ¿Cómo te diste cuenta y qué medidas tomaste para solucionarlo?','behavioral','intermediate'),
('Cuéntame una situación en la que tuviste que lidiar con un cliente muy insatisfecho o enfadado. ¿Cuál fue el resultado?','behavioral','intermediate'),
('Dame un ejemplo de una idea que propusiste y que fue rechazada inicialmente. ¿Qué hiciste para intentar convencer a los demás?','behavioral','intermediate'),
('Describe una ocasión en la que hiciste más de lo que se esperaba de ti en un proyecto sin que nadie te lo pidiera.','behavioral','intermediate'),
('Cuéntame de una vez en la que un proyecto importante estaba destinado al fracaso. ¿Cómo intervendrías para cambiar el rumbo?','behavioral','advanced'),
('Describe una situación en la que tuviste un conflicto serio con un superior o una figura de autoridad. ¿Cómo se resolvió y cómo quedó la relación?','behavioral','advanced'),
('Dame un ejemplo de una decisión que tuviste que tomar basándote en información incompleta o bajo mucha presión de tiempo. ¿Qué factores priorizaste?','behavioral','advanced'),
('Cuéntame de alguna vez en la que te viste presionado para tomar un "atajo" o hacer algo éticamente dudoso. ¿Cómo reaccionaste?','behavioral','advanced'),
('Sinceramente, veo que te falta experiencia para este puesto. ¿Por qué crees que no perderemos el tiempo contigo?"','stress','basic'),
('Hemos entrevistado a candidatos con mejor formación que la tuya hoy. ¿Qué tienes tú que ellos no tengan?','stress','basic'),
('Dime un defecto tuyo que realmente me haga no querer contratarte ahora mismo.','stress','basic'),
('Si otra empresa te ofrece 5.000€ más mañana, ¿nos dejarías tirados, verdad?','stress','basic'),
('El reclutador te corta a mitad de frase): Eso que dices no tiene sentido, ve al grano. ¿Qué hiciste exactamente?','stress','intermediate'),
('¿Cómo es posible que tardaras tanto tiempo en terminar ese proyecto que mencionas en tu CV? Parece una falta de eficiencia.','stress','intermediate'),
('Si tu jefe te da una orden que sabes que es errónea pero te obliga a cumplirla, ¿lo haces y callas o te enfrentas a él arriesgando tu puesto?','stress','intermediate'),
('Tras tu respuesta, el reclutador se queda callado mirándote fijamente sin anotar nada durante 30 segundos para ver si pierdes los nervios y empiezas a hablar de más.','stress','intermediate'),
('Me da la sensación de que estás intentando engañarme con esta respuesta. ¿Siempre eres así de ambiguo en tu trabajo?','stress', 'advanced'),
('Imagina que por un error tuyo la empresa pierde a su mayor cliente hoy. Tienes al CEO gritándote en el despacho. ¿Qué palabras exactas usas para que no te despida en ese momento?','stress', 'advanced'),
('Tienes 30 segundos: ¿Cuántas pelotas de tenis caben en un avión Boeing 747? Justifica tu lógica mientras te cronometro.','stress', 'advanced'),
('El reclutador te hace tres preguntas complejas seguidas sin dejarte responder a la primera y te exige que las contestes en orden inverso.','stress', 'advanced'),
('¿Qué es lo que más te llamó la atención de nuestra página web o redes sociales?','culture_fit','basic'),
('¿Prefieres trabajar en una oficina abierta con mucho movimiento o en un espacio tranquilo y silencioso?','culture_fit','basic'),
('¿Te gusta más trabajar solo y concentrado o formar parte de reuniones constantes de lluvia de ideas?','culture_fit','basic'),
('¿Cómo describirías la cultura de tu última empresa y qué es lo que más te gustaba de ella?','culture_fit','basic'),
('¿Cómo reaccionas cuando un compañero critica constructivamente tu trabajo en público?','culture_fit','intermediate'),
('¿Qué tipo de liderazgo te hace ser más productivo: uno que te dé total libertad o uno que te marque hitos diarios?','culture_fit','intermediate'),
('Si ves que un compañero no está cumpliendo con los estándares de calidad del equipo, ¿qué haces?','culture_fit','intermediate'),
('¿Qué importancia le das a la flexibilidad horaria frente a los beneficios económicos?','culture_fit','intermediate'),
('Nuestros valores son X e Y. ¿Puedes darme un ejemplo de tu vida personal o profesional donde hayas aplicado uno de ellos sin que nadie te lo pidiera?','culture_fit','advanced'),
('Si dentro de un año te diéramos presupuesto para mejorar el ambiente de trabajo, ¿en qué lo invertirías primero?','culture_fit','advanced'),
('Imagina que para cumplir un objetivo de ventas tenemos que sacrificar uno de nuestros valores de atención al cliente. ¿Qué posición tomarías en la reunión de equipo?','culture_fit','advanced'),
('¿Qué huella o cambio positivo te gustaría dejar en esta empresa más allá de tus tareas técnicas?','culture_fit','advanced');

INSERT into ai_resume_guides (industry, company_type, recomendations) VALUES
('none','none','La mayoría de empresas grandes usan un software (ATS) que escanea palabras clave. Independientemente del sector, asegúrate de que los títulos de tus puestos coincidan con los de la oferta de trabajo.'),
('none','none','¿Díme en qué sector profesional te mueves tú para poder darte consejos más específicos?'),
('corporate_companies','banca, consultoría, derecho, seguros, gran industria','Buscan seriedad, estabilidad y resultados cuantificables.
Diseño: Limpio, sobrio, con mucho espacio en blanco y fuentes clásicas (Arial, Calibri). Evita gráficos excesivos.
Enfoque: Pon el foco en tu formación académica y en hitos logrados.
Palabras clave: "Optimización", "Rentabilidad", "Gestión de equipos", "Cumplimiento de objetivos".
Tip: Usa el formato cronológico inverso (lo más reciente primero).'),
('startups','programación, marketing, Data Science, Fintech','Valoran la agilidad, la autoaprendizaje y las herramientas técnicas.
Diseño: Moderno y funcional. Puedes incluir enlaces a tu GitHub, Portfolio o LinkedIn.
Enfoque: Prioriza tus habilidades técnicas (Stack) y los proyectos en los que has participado. Menos títulos, más soluciones.
Palabras clave: "Escalabilidad", "Metodologías Ágiles", "Desarrollo", "Implementación".
Tip: No te extiendas en descripciones largas; usa bullet points directos.'),
(' creative_design','publicidad, arquitectura, moda, diseño gráfico','Tu CV es tu primera muestra de trabajo. Aquí el riesgo está permitido.
Diseño: Debe ser visualmente atractivo y original. La tipografía y la composición deben demostrar tu gusto estético.
Enfoque: Tu Portfolio es lo más importante. El CV debe ser una extensión de tu estilo personal.
Palabras clave: "Concepto", "Dirección de arte", "Innovación", "Identidad visual".
Tip: Asegúrate de que, aunque sea creativo, sea legible para los sistemas automáticos de lectura (ATS).
'),
('customer_service,','hostelería, comercio, recepción, atención al cliente','Buscan actitud, disponibilidad y habilidades sociales.
Diseño: Sencillo y muy fácil de leer de un vistazo.
Enfoque: Destaca tu experiencia de cara al público, polivalencia y dominio de idiomas.
Palabras clave: "Resolución de conflictos", "Fidelización", "Trabajo en equipo", "Flexibilidad".
Tip: Si tienes fotos o cartas de recomendación de clientes o antiguos jefes, menciónalo.'
),
('public_acaddemic','investigación, docencia, administraciones','Lo que importa es la acreditación oficial.
Diseño: Estándar (formato CV Europass es muy común aquí).
Enfoque: Detalla publicaciones, cursos certificados, años de experiencia oficial y oposiciones (si aplica).
Tip: No resumas tanto; en este sector la extensión suele ser mayor para incluir todos los méritos.

');

INSERT INTO ai_skill_improvement (skill_name, description, improvement_methods, resources) VALUES
('comunicación asertiva','Capacidad de expresar ideas,sentimientos y necesidades de manera directa, segura y honesta, respetando al mismno tiempo los derechos de los demás. Es vital para evitar malentendidos y resolver conflictos.', 'Antes de responder, parafrasea lo que el otro dijo para confirmar que entendiste el mensaje real.','Libro: Crucial Conversations. Plataformas: Toastmasters International (para hablar en público).'),
('pensamiento crítico y resolución de problemas','La habilidad de analizar información de forma objetiva, cuestionar premisas y llegar a conclusiones lógicas para resolver situaciones complejas de manera eficiente.','Ante un problema, pregunta "¿Por qué?" cinco veces seguidas para llegar a la raíz del asunto en lugar de tratar solo el síntoma.','Curso: Critical Thinking en LinkedIn Learning. Metodología: Los 6 Sombreros para Pensar (Edward de Bono).'),
('adaptabilidad y flexibilidad','Capacidad para ajustarse rápidamente a nuevos entornos, tecnologías o cambios en la estrategia de la empresa sin perder la productividad.','Inscríbete en cursos de temas que no domines para acostumbrarte a ser "principiante" constantemente.','Plataforma: Coursera o edX (para cursos cortos). Concepto: Learnability (habilidad de aprender a aprender).'),
('Alfabetización de Datos (Data Literacy)','La habilidad de leer, trabajar, analizar y argumentar con datos. No se trata de ser matemático, sino de entender qué dicen los números para tomar decisiones.','Dominio de Herramientas de Visualización. Aprende a usar Excel avanzado, Power BI o Tableau para convertir tablas aburridas en gráficos que cuenten una historia.','Recurso: Google Data Analytics Professional Certificate. Web: Kaggle (para practicar con datos reales).'),
('Gestión del Tiempo y Productividad','Capacidad de planificar y ejercitar el control consciente sobre el tiempo dedicado a actividades específicas para aumentar la eficiencia.','Técnica Pomodoro. Trabaja en bloques de 25 minutos con 5 de descanso para entrenar la concentración profunda (Deep Work).','Método: Getting Things Done (GTD) de David Allen. Libro: Deep Work de Cal Newport.'),
('Liderazgo e Influencia','No se limita a jefes; es la capacidad de inspirar, guiar y motivar a otros hacia el logro de un objetivo común, independientemente del cargo.','Mentoría Inversa. Ofrece enseñar una habilidad que domines a un colega; esto desarrolla tu paciencia y capacidad de guía.','Podcast: The Learnerability Podcast. Libro: Los 7 hábitos de la gente altamente efectiva (Stephen Covey).'),
('IA Generativa y "Prompt Engineering"','Capacidad para interactuar con modelos de lenguaje y herramientas de IA para optimizar procesos, redactar contenido, analizar datos o programar de forma más eficiente. No es saber "usar un chat", es saber diseñar las instrucciones para obtener resultados profesionales.','Técnica de "Chain-of-Thought". Practica pidiéndole a la IA que "piense paso a paso" antes de darte una respuesta final; esto mejora drásticamente la precisión del resultado.','Curso: IA para todos (Andrew Ng). Web: LearnPrompting.org.'),
('Inteligencia Emocional (EQ)','La capacidad de reconocer, entender y gestionar nuestras propias emociones y las de los demás. En entornos de trabajo remoto o híbrido, es la habilidad que mantiene unidos a los equipos y evita el "burnout".','Diario de Autorreflexión. Al final del día, anota una situación que te haya generado estrés y analiza: ¿Qué sentí? ¿Cómo reaccioné? ¿Cómo afectó a los demás?','Libro: Inteligencia Emocional (Daniel Goleman). App: Headspace (para gestión de estrés).'),
('Mentalidad Ágil (Agile Mindset)','Más que usar un software, es una forma de trabajar basada en la entrega de valor constante, la mejora iterativa y la respuesta rápida al cambio, en lugar de seguir planes rígidos.','Implementar un tablero Kanban personal. Usa columnas de "Por hacer", "En proceso" y "Hecho" para visualizar tu carga de trabajo diaria y evitar el "multitasking".','Certificación: PSM I (Scrum.org). Guía: La Guía de Scrum (ScrumGuides.org).'),
('Pensamiento Sistémico (Systems Thinking)','La capacidad de comprender cómo las distintas partes de una organización o un proyecto interactúan entre sí. En lugar de ver tareas aisladas, ves procesos interconectados. Es fundamental para roles de gestión y estrategia.','Mapeo de Procesos. Elige un problema común en tu trabajo anterior y dibuja un diagrama de flujo que muestre todos los departamentos y personas que afectaba.','Libro: La Quinta Disciplina (Peter Senge).'),
('Marca Personal y Networking Digital','No es solo "tener LinkedIn", es la habilidad de gestionar tu reputación profesional y construir una red de contactos de valor de manera proactiva y ética.','Curación de Contenido. Comparte una vez a la semana un artículo o reflexión técnica sobre tu sector en redes profesionales. Esto te posiciona como un referente.','Recurso: Personal Branding Masterclass en Udemy.'),
('Alfabetización Financiera (Business Acumen)','Entender cómo la empresa gana dinero y cómo tus acciones afectan la rentabilidad (el bottom line). Un empleado que entiende el negocio es mucho más valioso que uno que solo ejecuta tareas.','Lectura de Reportes Anuales. Lee el informe de resultados de una empresa pública de tu sector para entender qué métricas les importan (EBITDA, ingresos recurrentes, etc.).','Libro: Padre Rico, Padre Pobre (para bases) o Finance for Managers (HBR).');


