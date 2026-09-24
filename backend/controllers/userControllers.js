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

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
        return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
        return res.status(400).json({ message: "contraseña incorrecta" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "contraseña correcta", token });
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
