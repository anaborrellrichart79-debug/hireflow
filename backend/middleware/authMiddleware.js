import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No se proporcionó un token de autenticación" });
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // Un token caducado o mal formado es algo normal (el usuario dejó la
        // app abierta), no un fallo del servidor: no se vuelca la traza al log.
        // El frontend trata cualquier 401 con token como sesión caducada
        // (ver docs/decisions.md, entrada 025).
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "La sesión ha caducado. Vuelve a iniciar sesión." });
        }
        return res.status(401).json({ message: "Token de autenticación no válido" });
    }

    // Fuera del try: un error de un middleware o controller posterior no debe
    // acabar respondido como "token no válido".
    next();
};
