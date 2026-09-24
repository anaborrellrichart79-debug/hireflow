import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, getUserById, updateUser, deleteUser } from "../models/User.js";

export const createNewUser = async (req, res) => {
    try {
        const newUser = await createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "El email ya está registrado" });
        }
        throw error;
    }
};

// Hash de relleno para comparar cuando el email no existe: así el login
// tarda lo mismo exista o no el usuario, y el tiempo de respuesta no delata
// qué emails están registrados.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("hireflow-dummy-password", 10);

// Mismo mensaje y mismo 401 tanto si el email no existe como si la
// contraseña es incorrecta -- distinguirlos permitía averiguar qué emails
// tienen cuenta. Ver docs/decisions.md, entrada 020.
const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrectos";

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    const validPassword = await bcrypt.compare(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);

    if (!user || !validPassword) {
        return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "Sesión iniciada", token });
};

// GET /users/me
export const getProfile = async (req, res) => {
    const user = await getUserById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
};

// PUT /users/me
export const updateProfile = async (req, res) => {
    const result = await updateUser(req.user.id, req.body);

    if (!result) {
        return res.status(400).json({ message: "Ningún campo válido para actualizar" });
    }

    res.json({ message: "Perfil actualizado correctamente" });
};

// DELETE /users/me
export const deleteProfile = async (req, res) => {
    await deleteUser(req.user.id);
    res.json({ message: "Cuenta eliminada correctamente" });
};
