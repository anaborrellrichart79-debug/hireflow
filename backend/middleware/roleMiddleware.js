// Debe usarse siempre después de verifyToken, ya que depende de req.user.role.
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
        }
        next();
    };
};
