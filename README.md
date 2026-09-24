# HireFlow

HireFlow es una aplicación web diseñada para organizar y optimizar el proceso de búsqueda de empleo.
Permite a los usuarios gestionar ofertas de empleo (postulaciones), entrevistas, contectos profesionales y seguimiento de oportunidades laborales desde un único lugar.

La aplicación también incluye un módulo Curriculum IA, que ofrece información y recursos para mejorar curriculums, preparar entrevistas y desarrollar habilidades profesionales.

El objetivo del proyecto es crear una herramienta realista que combine gestión de empleo, visualización de progreso y organización personal, con una arquitectura preparada para futuras ampliaciones.

## Funcionalidades principales

    ### Gestión de ofertas de trabajo (postulaciones)

    Los usuarios pueden:
        - Crear, editar y eliminar ofertas de trabajo.
        - guardar información sobre empresas y ofertas de trabajo.
        - añadir notas y realizar seguimiento del proceso de gestión.
  
    Estados posibles de las ofertas de trabajo:
        - Wishlist
        - Applied
        - Interview
        - Offer
        - Rejected

    Cada oferta laboral incluye:
        - Empresa
        - Puesto
        - Ubicación
        - Fecha de aplicación (entrada)
        - Notas
  
    ### Sistema de usuarios

    La aplicación contempla dos tipos de usuarios:

        Candidate --> Personas en busca de empleo.
            Datos principales:
                - Nombre
                - Email
                - Contraseña
                - Sector profesional
            Datos opcionales:
                - Teléfono
                - Estudios
                - Aptitudes
                - Ubicación
                - Visibilidad para el perfil de empresas.

        Company/recruiter --> Empresas o reclutadores interesados en encontrar candidatos.
            Datos principales:
                - Nombre empresa
                - email
                - Contraseña
            Datos opcionales:
                - Descripción
                - Tipo de entrevista
                - Ubicación
                - Teléfono
  
    ### Gestión de entrevistas

    Permite registrar entrevistas asociadas a una oferta de trabajo:

        Tipos de entrevistas incluiidos:
            - Estructurada
            - no estructurada
            - técnica
            - telefónica
            - online
            - presencial
            - panel
            - dinámica de grupo

    ### Calendario de eventos

        Los usuarios pueden organizar:
            - Entrevistas
            - búsqueda de empleo
            - recordatorios
            - reuniones

    El sistema se va a preparar para poder integrar google calendar en un futuro.

    ### Seguimiento de oportunidades

    Permite eliminar o actualizar oportunidades fácilmente.

        Panel donde se muestran:
            - postulaciones activas
            - estado del proceso
            - Empresas en seguimiento

    ### Importación de ofertas de empleo

    Esto permite centralizar oportunidades laborales en un único panel.

        Se puede importar ofertas desde:
            - linkedin
            - APIs de empleo externas
  
    ### Curriculum IA

    Este módulo proporciona información útil para la búsqueda de empleo mediante una base de conocimientos almacenada en SQL.

        Incluye:
            - tipos de entrevista laboral
            - preguntas frecuentes en entrevisatas
            - guías para crear currículums según tipo de empresa
            - Técnicas para mejorar habilidades profesionales.+
  
        La interfaz incluye:
            - historial de chats
            - documentos enviados por el usuario
            - panel de respuestas
            - adjuntar archivos pdf.
            - envio de preguntas o adjuntos.
  
## Arquitectura del proyecto

    El proyecto está dividido en frontend (JavaScript sin framework, módulos ES) y backend (Node.js + Express + MySQL).
    El propio servidor Express sirve el frontend, así que todo funciona en http://localhost:3000.

        hireflow/
        |
        |--- frontend/
        |       |---- index.html
        |       |---- style/            main.css, layout.css, components.css, mascot.css
        |       |---- assets/           iconos SVG, favicon y mascota
        |       |---- js/
        |               |---- app.js            arranque: rutas, cabecera, idioma, mascota
        |               |---- router.js         rutas por hash (#/jobs, #/calendar...)
        |               |---- api.js            fetch a /api, token JWT, sesión caducada
        |               |---- auth.js           login, registro, cierre de sesión
        |               |---- i18n.js           textos en español, inglés, francés e italiano
        |               |---- mascot.js         mascota animada
        |               |---- components/       ui.js (el(), diálogos, avisos), header, cardGrid...
        |               |---- screens/          una por pantalla: login, home, jobs, jobForm,
        |                                       applications, applicants, calendar, profileForm, ai
        |
        |--- backend/
        |       |---- server.js         Express, cabeceras de seguridad (helmet), rutas /api
        |       |---- .env.example      variables de entorno necesarias (copiar a .env)
        |       |---- config/           conexión a MySQL
        |       |---- routes/           users, jobs, companies, applications, interviews, calendar, ai
        |       |---- controllers/      lógica de cada ruta
        |       |---- models/           consultas SQL (con comprobación de propiedad en la propia query)
        |       |---- validators/       validación de entrada (express-validator)
        |       |---- middleware/       token JWT, roles, límite de intentos de login, errores
        |       |---- constants/        estados de una postulación
        |       |---- database/
        |               |---- schema.sql                estructura de todas las tablas
        |               |---- seed.sql                  contenido del asistente IA (en español)
        |               |---- seed_ai_translations.sql  su traducción a inglés, francés e italiano
        |               |---- migrations/               cambios para bases ya creadas, en orden
        |
        |--- docs/          API, base de datos, decisiones técnicas, changelog, estado del proyecto
        |--- postman/       colección de Postman para probar la API

## Cómo arrancarlo

    1. Instala las dependencias:  cd backend  y  npm install
    2. Crea la base de datos (ver "Instalación de la Base de Datos", más abajo).
    3. Copia backend/.env.example a backend/.env y rellena tus datos de MySQL y un JWT_SECRET largo y aleatorio.
    4. Arranca el servidor:  npm start  (o  npm run dev  para que se reinicie al guardar cambios).
    5. Abre http://localhost:3000

## Tecnologías aplicadas

    ### Frontend
        - HTML
        - CSS
        - Vanilla JavaScript (ES6 Modules)
  
    ### Backend
        - node.js
        - Express.js

    ### Base de Datos
        - MySQL
  
    ### Arquitectura (Resumen)
        - API REST
        - Modular JavaScript
        - Separación frontend / backend

## Instalación de la Base de Datos

    1. Crear la base de datos ejecutando el archivo --> backend/database/schema.sql
    2. Insertar los datos iniciales --> backend/database/seed.sql
    3. Insertar las traducciones del asistente IA (inglés, francés, italiano) --> backend/database/seed_ai_translations.sql

    Esto creará la estructura completa de las tablas y el contenido del asistente IA: tipos de entrevista, preguntas, guías de currículum y técnicas de mejora, en los 4 idiomas de la app.
    Ejecuta los archivos con --default-character-set=utf8mb4 para que se guarden bien las tildes.

    Si ya tienes una base creada con una versión anterior, aplica en orden los archivos de backend/database/migrations/ que te falten (cada uno explica qué cambia).

## Estado del proyecto

    HireFlow se está desarrollando de forma incremental dentro del repositorio portafolio-2026.
    El proyecto se sube progresivamente para mostrar la evolución del desarrollo, la arquitectura del sistema, valorar la organización y el manejo de Git.

## Diagrama del proyecto

    Próximamente...

## Autora

    ¡Hola! Soy Ana Borrell, desarrolladora frontend junior en formación, apasionada por
    crear experiencias web interactivas y funcionales. Este portfolio contiene los 
    proyectos que he desarrollado para demostrar mis habilidades en **HTML5, CSS3, 
    JavaScript y React**, y sirve como carta de presentación para oportunidades 
    profesionales. En este caso en concreto, una aplicación para organizar el caótico 
    mundo de la busqueda de empleo.
