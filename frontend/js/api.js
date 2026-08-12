const TOKEN_KEY = "hireflow_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Decodifica el payload del JWT en el cliente (solo lectura, sin verificar
// firma -- la verificación real la hace siempre el backend). Sirve para
// saber el id/email/role del usuario logueado sin llamar a GET /users/me.
export const getCurrentUser = () => {
    const token = getToken();
    if (!token) {
        return null;
    }
    try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
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

    if (!response.ok) {
        throw new ApiError(data?.message || "Error de red", response.status, data?.errors);
    }

    return data;
};
