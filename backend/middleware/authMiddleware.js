import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({message: "No se proporcionó un token de autentificación"});
        }
        
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }

    catch (error) {
        console.log(error);
        
        return res.status(401).json({message: "token de autentificación no valido"});
    };
};