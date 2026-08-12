import { apiFetch, setToken, clearToken, getCurrentUser } from "./api.js";

export { getCurrentUser };

export const login = async (email, password) => {
    const data = await apiFetch("/users/login", { method: "POST", body: { email, password } });
    setToken(data.token);
    return getCurrentUser();
};

export const register = async ({ name, email, password, role, termsAccepted }) => {
    await apiFetch("/users", { method: "POST", body: { name, email, password, role, termsAccepted } });
    return login(email, password);
};

export const logout = () => {
    clearToken();
};

export const isAuthenticated = () => Boolean(getCurrentUser());

export const currentRole = () => getCurrentUser()?.role ?? null;
