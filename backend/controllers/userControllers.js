import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, getUserById, updateUser, deleteUser, getPasswordHashById } from "../models/User.js";
import { getUserProfileByUserId, upsertUserProfile, deleteUserProfile } from "../models/userProfile.js";

export const createNewUser = async (req, res) => {
    try {
        const newUser = await createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: req.t("users.emailTaken") });
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
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    const validPassword = await bcrypt.compare(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);

    if (!user || !validPassword) {
        return res.status(401).json({ message: req.t("auth.invalidCredentials") });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: req.t("auth.loggedIn"), token });
};

// GET /users/me
export const getProfile = async (req, res) => {
    const user = await getUserById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: req.t("users.notFound") });
    }

    res.json(user);
};

// PUT /users/me
export const updateProfile = async (req, res) => {
    const result = await updateUser(req.user.id, req.body);

    if (!result) {
        return res.status(400).json({ message: req.t("common.noValidFields") });
    }

    res.json({ message: req.t("users.profileUpdated") });
};

// DELETE /users/me -- pide la contraseña: con una sesión abierta en un equipo
// ajeno no se puede borrar la cuenta. 403 y no 401 si no coincide: el
// frontend trata cualquier 401 como sesión caducada y cerraría la sesión.
// Ver docs/decisions.md, entrada 042.
export const deleteProfile = async (req, res) => {
    const hash = await getPasswordHashById(req.user.id);
    if (!hash) {
        return res.status(404).json({ message: req.t("users.notFound") });
    }
    if (!(await bcrypt.compare(req.body.password, hash))) {
        return res.status(403).json({ message: req.t("users.wrongPassword") });
    }
    await deleteUser(req.user.id);
    res.json({ message: req.t("users.accountDeleted") });
};

// GET /users/me/cv -- sin CV guardado devuelve 200 con los campos a null (no
// 404): no tener CV todavía es el estado normal de un candidato nuevo, no un error
export const getCv = async (req, res) => {
    const cv = await getUserProfileByUserId(req.user.id);

    res.json(cv ?? {
        id: null,
        user_id: req.user.id,
        education: null,
        work_experience: null,
        skills: null,
        resume_url: null,
        about: null,
        created_at: null,
        updated_at: null
    });
};

// PUT /users/me/cv -- crea el CV la primera vez, lo actualiza las siguientes
export const saveCv = async (req, res) => {
    const result = await upsertUserProfile(req.user.id, req.body);

    if (!result) {
        return res.status(400).json({ message: req.t("cv.noValidFields") });
    }

    const cv = await getUserProfileByUserId(req.user.id);
    res.json(cv);
};

// DELETE /users/me/cv -- borra solo el CV, no la cuenta
export const deleteCv = async (req, res) => {
    const result = await deleteUserProfile(req.user.id);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: req.t("cv.notFound") });
    }

    res.json({ message: req.t("cv.deleted") });
};
