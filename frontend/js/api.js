const TOKEN_KEY = "hireflow_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Sesión caducada: se guarda en sessionStorage a qué pantalla se quería ir,
// para avisar en el login ("Tu sesión ha caducado") y volver ahí después
// de iniciar sesión. Ver docs/decisions.md, entrada 025.
const SESSION_EXPIRED_KEY = "hireflow_session_expired";

const currentHashPath = () => window.location.hash.replace(/^#/, "") || "/";

export const markSessionExpired = () => {
    clearToken();
    try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, currentHashPath());
    } catch {
        // Sin sessionStorage (modo privado estricto): solo se pierde el aviso.
    }
};

// Ruta a la que volver si la sesión caducó, o null si no hubo caducidad.
// No borra la marca: así el aviso sigue ahí aunque se recargue el login o se
// cambie de idioma. Se borra al iniciar sesión (clearSessionExpired).
export const getSessionExpiredReturnTo = () => {
    try {
        return sessionStorage.getItem(SESSION_EXPIRED_KEY);
    } catch {
        return null;
    }
};

export const clearSessionExpired = () => {
    try {
        sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    } catch {
        // Nada que limpiar si no hay sessionStorage.
    }
};

// Decodifica el payload del JWT en el cliente (solo lectura, sin verificar
// firma -- la verificación real la hace siempre el backend). Sirve para
// saber el id/email/role del usuario logueado sin llamar a GET /users/me.
// Un token caducado (exp en el pasado) cuenta como sesión cerrada: si no, la
// app seguía "logueada" y todas las pantallas fallaban con 401.
export const getCurrentUser = () => {
    const token = getToken();
    if (!token) {
        return null;
    }
    let payload;
    try {
        payload = JSON.parse(atob(token.split(".")[1]));
    } catch {
        return null;
    }
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
        markSessionExpired();
        return null;
    }
    return payload;
};

export class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.status = status;
        this.errors = errors || [];
    }
}

export const apiFetch = async (path, { method = "GET", body } = {}) => {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    // 401 con token en una ruta protegida: el token ya no vale (caducó
    // mientras se usaba la app, o se firmó con otro secreto). Se cierra la
    // sesión y se manda al login, en vez de dejar la pantalla con el error.
    // El login en sí también da 401 (credenciales incorrectas), pero ahí no
    // hay token y no se toca.
    if (response.status === 401 && token && path !== "/users/login") {
        markSessionExpired();
        window.location.hash = "/login";
    }

    if (!response.ok) {
        throw new ApiError(data?.message || "Error de red", response.status, data?.errors);
    }

    return data;
};
