import { getCurrentUser } from "./api.js";
import { navigate } from "./router.js";
import { onLangChange, getMascotPhrases } from "./i18n.js";

// Mascota global (persiste en todas las pantallas, se monta una sola vez
// desde app.js en #mascot-root, fuera de .main-container para no perderse
// al cambiar de ruta). No hace collision-detection real contra cada botón o
// texto del DOM -- eso exigiría remedir constantemente contenido dinámico
// en cada pantalla. En su lugar, se mueve entre "anclas" ancladas al
// viewport (esquinas y bordes), lejos de la columna central donde vive el
// contenido (formularios, listados) en casi todas las pantallas. Es una
// aproximación deliberada, documentada en docs/decisions.md, entrada 014.
const SIZE = 64;
const HEADER_HEIGHT = 92;
const BOTTOM_MARGIN = 56;
const EDGE_MARGIN = 12;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getAnchors = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // En móvil el contenido es de una sola columna a todo lo ancho (a
    // diferencia de las columnas centradas de escritorio/tablet), así que
    // hasta las anclas laterales a media altura pueden caer sobre texto.
    const singleColumn = w < 600;
    // Entre 600 y 1000px (tablet) el contenido centrado (max-width 480-900px
    // según pantalla) sigue ocupando casi todo el ancho del viewport, así que
    // el ancla junto al header choca con el texto introductorio de casi
    // todas las pantallas (p. ej. el resumen de Home) -- solo hay margen de
    // sobra a los lados del contenido a partir de escritorio.
    const wideEnoughForTopAnchors = w >= 1000;

    const anchors = [
        { x: w - SIZE - EDGE_MARGIN, y: h - SIZE - BOTTOM_MARGIN },
        { x: EDGE_MARGIN, y: h - SIZE - BOTTOM_MARGIN }
    ];

    if (!singleColumn) {
        anchors.push({ x: w - SIZE - EDGE_MARGIN, y: h / 2 });
        anchors.push({ x: EDGE_MARGIN, y: h / 2 });
    }

    if (wideEnoughForTopAnchors) {
        anchors.push({ x: w - SIZE - EDGE_MARGIN, y: HEADER_HEIGHT });
        anchors.push({ x: EDGE_MARGIN, y: HEADER_HEIGHT });
    }

    return anchors;
};

const pickDifferent = (arr, excludeIndex) => {
    if (arr.length <= 1) {
        return 0;
    }
    let index;
    do {
        index = Math.floor(Math.random() * arr.length);
    } while (index === excludeIndex);
    return index;
};

export const initMascot = () => {
    const root = document.getElementById("mascot-root");
    if (!root) {
        return;
    }

    root.innerHTML = "";
    root.classList.add("mascot-root");

    const bubble = document.createElement("div");
    bubble.className = "mascot-bubble";

    const img = document.createElement("img");
    img.src = "assets/mascota-soporte.svg";
    img.alt = "Asistente HireFlow";
    img.className = "mascot-img";

    root.append(bubble, img);
    root.addEventListener("click", () => navigate("/ai"));

    let anchors = getAnchors();
    let anchorIndex = 0;
    let currentSide = "right";

    // El lado/borde en el que está anclada la mascota determina hacia dónde
    // debe "abrirse" el bocadillo -- si siempre abriera hacia el mismo lado,
    // cerca del borde contrario (incluido el borde superior, muy cerca del
    // header) se saldría de la pantalla.
    const place = (anchor) => {
        root.style.left = `${anchor.x}px`;
        root.style.top = `${anchor.y}px`;
        currentSide = anchor.x > window.innerWidth / 2 ? "right" : "left";
        const vSide = anchor.y < HEADER_HEIGHT + 100 ? "top" : "bottom";
        root.classList.remove("mascot-side-left", "mascot-side-right", "mascot-vside-top", "mascot-vside-bottom");
        root.classList.add(`mascot-side-${currentSide}`, `mascot-vside-${vSide}`);
    };
    place(anchors[anchorIndex]);

    let phrasePool = [];
    const refreshPhrasePool = () => {
        phrasePool = getMascotPhrases(getCurrentUser()?.role);
    };
    refreshPhrasePool();
    onLangChange(refreshPhrasePool);
    // El rol solo se conoce tras iniciar sesión; se refresca también en cada
    // navegación por si el usuario acaba de entrar (barato: solo lee el JWT
    // de localStorage, sin llamada a la API).
    window.addEventListener("hashchange", refreshPhrasePool);

    const doMove = async () => {
        anchors = getAnchors();
        anchorIndex = pickDifferent(anchors, anchorIndex);
        place(anchors[anchorIndex]);
        await wait(1800);
    };

    const doFlip = async () => {
        img.classList.add("mascot-flip");
        await wait(900);
        img.classList.remove("mascot-flip");
    };

    const doPeek = async () => {
        root.classList.add(`mascot-peek-${currentSide}`);
        await wait(1600);
        root.classList.remove(`mascot-peek-${currentSide}`);
        await wait(300);
    };

    const doBubble = async () => {
        if (phrasePool.length === 0) {
            return;
        }
        bubble.textContent = phrasePool[Math.floor(Math.random() * phrasePool.length)];
        bubble.classList.add("visible");
        await wait(4500);
        bubble.classList.remove("visible");
        await wait(300);
    };

    // Se repiten move/bubble para que sean más frecuentes que flip/peek.
    const actions = [doMove, doMove, doBubble, doBubble, doFlip, doPeek];

    const loop = async () => {
        await wait(4000 + Math.random() * 4000);
        const action = actions[Math.floor(Math.random() * actions.length)];
        try {
            await action();
        } catch {
            // Un fallo puntual de animación no debe detener el bucle.
        }
        loop();
    };

    loop();
};
