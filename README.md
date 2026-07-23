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
            - Linkedln
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

    El proyecto esta dividido en frontend y backend.

        hireFlow/
        |
        |--- frontend/
        |       |
        |       |---- index.html
        |       |
        |       |----- style/
        |       |       |----- main.css
        |       |       |----- layout.css
        |       |       |_____ components.css
        |       |
        |       |---- assets/
        |       |       |----icons/
        |       |       |___ images/
        |       |
        |       |___ js/
        |       |     |--- app.js
        |       |     |
        |       |    |--- state/
        |       |    |       |____ store.js
        |       |    |
        |       |     |--- service/
        |       |    |      |------ aplicationService.js
        │       |    │      ├------ userService.js
        │       |    │      ├------ jobService.js
        │       |    │      |______ calendarService.js
        |       |    |
        |       |    |--- ui/
        |       |    |    |--- board.js
        |       |    |    |--- forms.js
        |       |    |    |--- chart.js
        |       |    |    |--- stats.js
        |       |    |    |--- menu.js
        |       |    |    |--- calendar.js
        |       |    |    |____curriculumAI.js
        |       |    |
        |       |    |--- utils/
        |       |    |      |--- storage.js
        |       |    |      |--- helpers.js
        |       |    |      |___ validator.js
        |       |    |
        |       |    |___ api/
        |       |           |___ apiClient.js
        |       |
        |       |____ README.md
        |
        |___ backend/
                |
                |---- server.js
                |
                |---- config/
                |       |____ database.js
                |
                |---- routes/
                |       |----- authRoutes.js
                |       |----- userRoutes.js
                |       |----- applicationRoutes.js
                |       |----- jobRoutes.js
                |       |----- calendarRoutes.js
                |       |_____ aiRoutes.js
                |
                |---- controllers/
                |       |----- authControllers.js
                |       |----- userControllers.js
                |       |----- applicationControllers.js
                |       |----- jobControllers.js
                |       |----- calendarControllers.js
                |       |_____ aiControllers.js
                |
                |---- models/
                |       |----- User.js
                |       |----- Company.js
                |       |----- Application.js
                |       |----- JobOffer.js
                |       |----- interview.js
                |       |_____ AIKnowledge.js
                |
                |---- services/
                |       |----- linkedinService.js
                |       |----- jobImportService.js
                |       |----- aiService.js
                |
                |
                |---- database/
                |       |----- shema.sql
                |       |____ seedData.sql
                |       
                |---- package.json
                |
                |____ .env

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

    1. Crear la base de datos ejecutando el archivo --> schema.sql
    2. Insertar los datos iniciales --> seedData.sql
   
    Esto creará una estructura completas de las tablas en cuanto a tipo de entrevistas, las preguntas, las guías de curriculums y las técnicas.

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
