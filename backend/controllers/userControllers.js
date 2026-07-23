import bcrypt  from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, createUser, getAllUsers} from "../models/User.js";

export const getUsers = async (req, res) => {
    try {
    const users = await getAllUsers();
    res.json(users);
    } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios" });
    }
};

export const createNewUser = async (req, res) => {
    try {
    const newUser = await createUser(req.body);
    res.status(201).json(newUser);
    } catch (error) {
        console.log("Error al crear usuario", error); //importante para verificar en postman o en la consola un error específico.

    // ERROR DE EMAIL DUPLICADO
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
        message: "El email ya está registrado"
        });
    }

    res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req,res) => {
    try {
        const {email, password} = req.body;

        //verificar que existe el usuario
        const user = await findUserByEmail(email);

        if (!user){
            return res.status(400).json({message: "Usuario no encontrado"});
        };

        //verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword){
            return res.status(400).json({message: "contraseña incorrecta"});
        }

        //generar token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ message: "contraseña correcta", token });
    } catch (error) {
        res.status(500).json({ message: "Error al iniciar sesión" });
    }
};